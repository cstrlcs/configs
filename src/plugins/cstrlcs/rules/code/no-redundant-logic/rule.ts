import type { Context, ESTree, Fixer } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { isWithin } from "../shared/ast.ts";
import { COMPARISON_OPERATORS, returnedBoolean } from "../shared/expressions.ts";

type Comparison = ESTree.BinaryExpression | ESTree.PrivateInExpression;

const INVERTED_OPERATORS = new Map([
  ["!=", "=="],
  ["!==", "==="],
  ["<", ">="],
  ["<=", ">"],
  ["==", "!="],
  ["===", "!=="],
  [">", "<="],
  [">=", "<"],
]);

const EQUALITY_OPERATORS = new Set(["!=", "!==", "==", "==="]);

const BARE_PARENT_TYPES = new Set([
  "ArrayExpression",
  "ArrowFunctionExpression",
  "AssignmentExpression",
  "AssignmentPattern",
  "CallExpression",
  "ConditionalExpression",
  "DoWhileStatement",
  "ExpressionStatement",
  "ForStatement",
  "IfStatement",
  "JSXExpressionContainer",
  "LogicalExpression",
  "NewExpression",
  "Property",
  "ReturnStatement",
  "SequenceExpression",
  "SpreadElement",
  "SwitchStatement",
  "TemplateLiteral",
  "ThrowStatement",
  "VariableDeclarator",
  "WhileStatement",
  "YieldExpression",
]);

const PLAIN_OPERAND_TYPES = new Set(["CallExpression", "Identifier", "MemberExpression"]);

function invertedOperator(expression: ESTree.Expression) {
  return expression.type === "BinaryExpression"
    ? INVERTED_OPERATORS.get(expression.operator)
    : undefined;
}

function isComparison(expression: ESTree.Expression) {
  if (expression.type === "UnaryExpression") {
    return expression.operator === "!";
  }

  return expression.type === "BinaryExpression" && COMPARISON_OPERATORS.has(expression.operator);
}

function invertedText(context: Context, comparison: Comparison, operator: string) {
  const { text } = context.sourceCode;
  const { left, range, right } = comparison;

  const token = context.sourceCode.getFirstTokenBetween(
    left,
    right,
    (candidate) => candidate.value === comparison.operator,
  );

  if (token === null) {
    return context.sourceCode.getText(comparison);
  }

  return `${text.slice(range[0], token.range[0])}${operator}${text.slice(token.range[1], range[1])}`;
}

function needsParentheses(context: Context, node: ESTree.UnaryExpression) {
  const { sourceCode } = context;
  const { parent } = node;
  const isCallee = "callee" in parent && parent.callee === node;

  const isWrapped =
    sourceCode.getTokenBefore(node)?.value === "(" && sourceCode.getTokenAfter(node)?.value === ")";

  return !isWrapped && (!BARE_PARENT_TYPES.has(parent.type) || isCallee);
}

function checkNegation(context: Context, node: ESTree.UnaryExpression) {
  const { argument } = node;
  const operator = invertedOperator(argument);

  if (node.operator !== "!" || argument.type !== "BinaryExpression" || operator === undefined) {
    return;
  }

  const { sourceCode } = context;
  const text = invertedText(context, argument, operator);
  const replacement = needsParentheses(context, node) ? `(${text})` : text;

  const hasComments =
    sourceCode.getCommentsInside(node).length > sourceCode.getCommentsInside(argument).length;

  function fix(fixer: Fixer) {
    return hasComments ? null : fixer.replaceText(node, replacement);
  }

  if (EQUALITY_OPERATORS.has(argument.operator)) {
    context.report({ data: { operator }, fix, messageId: "invertedComparison", node });

    return;
  }

  context.report({
    data: { operator },
    messageId: "invertedComparison",
    node,
    suggest: [{ data: { operator }, fix, messageId: "invertComparison" }],
  });
}

function branchBoolean(statement: ESTree.Statement) {
  const body = statement.type === "BlockStatement" ? statement.body : [statement];
  const [only] = body;

  if (body.length !== 1) {
    return;
  }

  return returnedBoolean(only);
}

function siblings({ parent }: ESTree.IfStatement) {
  if (parent.type === "BlockStatement") {
    return parent.body;
  }

  return parent.type === "SwitchCase" ? parent.consequent : [];
}

function followingReturn(node: ESTree.IfStatement) {
  const statements = siblings(node);
  const index = statements.indexOf(node);
  const next = statements[index + 1];

  const isGuardChain = statements
    .slice(0, index)
    .some(
      (statement) =>
        statement.type === "IfStatement" && branchBoolean(statement.consequent) !== undefined,
    );

  return !isGuardChain && next?.type === "ReturnStatement" ? next : undefined;
}

function negatedNegation(context: Context, { argument }: ESTree.UnaryExpression) {
  const text = context.sourceCode.getText(argument);

  return isComparison(argument) ? text : `Boolean(${text})`;
}

function negatedText(context: Context, test: ESTree.Expression) {
  const text = context.sourceCode.getText(test);
  const operator = invertedOperator(test);

  if (test.type === "UnaryExpression" && test.operator === "!") {
    return negatedNegation(context, test);
  }

  if (
    test.type === "BinaryExpression" &&
    operator !== undefined &&
    EQUALITY_OPERATORS.has(test.operator)
  ) {
    return invertedText(context, test, operator);
  }

  return PLAIN_OPERAND_TYPES.has(test.type) ? `!${text}` : `!(${text})`;
}

function reportBooleanReturn(context: Context, node: ESTree.IfStatement, last: ESTree.Statement) {
  const { sourceCode } = context;
  const range: [number, number] = [node.range[0], last.range[1]];
  const hasComments = sourceCode.getAllComments().some((comment) => isWithin(comment.range, range));
  const text = sourceCode.getText(node.test);
  const condition = node.test.type === "SequenceExpression" ? `(${text})` : text;

  function replace(returned: string) {
    return (fixer: Fixer) =>
      hasComments ? null : fixer.replaceTextRange(range, `return ${returned};`);
  }

  if (branchBoolean(node.consequent) === false) {
    context.report({
      fix: replace(negatedText(context, node.test)),
      messageId: "singleBooleanReturn",
      node,
    });

    return;
  }

  if (isComparison(node.test)) {
    context.report({ fix: replace(condition), messageId: "singleBooleanReturn", node });

    return;
  }

  context.report({
    messageId: "singleBooleanReturn",
    node,
    suggest: [
      { fix: replace(`Boolean(${text})`), messageId: "returnBoolean" },
      { fix: replace(condition), messageId: "returnCondition" },
    ],
  });
}

function checkIf(context: Context, node: ESTree.IfStatement) {
  const value = branchBoolean(node.consequent);
  const last = value === undefined ? undefined : (node.alternate ?? followingReturn(node));

  if (node.parent.type === "IfStatement" || last === undefined || branchBoolean(last) !== !value) {
    return;
  }

  reportBooleanReturn(context, node, last);
}

export const noRedundantLogic = defineRule({
  meta: {
    docs: {
      description:
        "Forbid roundabout boolean logic: if statements that only return true or false, and negated comparisons.",
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      invertComparison: 'Use "{{operator}}" instead (the result differs when an operand is NaN).',
      invertedComparison: 'Use "{{operator}}" instead of negating the comparison.',
      returnBoolean: "Return the condition converted with Boolean().",
      returnCondition: "Return the condition as is, if it is already a boolean.",
      singleBooleanReturn:
        "This if statement only picks between returning true and false. Return the condition instead.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      IfStatement(node) {
        checkIf(context, node);
      },
      UnaryExpression(node) {
        checkNegation(context, node);
      },
    };
  },
});
