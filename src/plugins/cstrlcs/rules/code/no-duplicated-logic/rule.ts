import type { FunctionNode } from "../shared/functions.ts";
import type { Context, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { contains } from "../shared/ast.ts";
import { tokenValues } from "../shared/tokens.ts";

interface Branch {
  key: string;
  node: ESTree.Node;
  statements: readonly ESTree.Node[];
}

type Operation = ESTree.BinaryExpression | ESTree.LogicalExpression;

const MINIMUM_FUNCTION_LINES = 3;

const FUNCTION_OWNERS = new Set([
  "MethodDefinition",
  "Property",
  "PropertyDefinition",
  "VariableDeclarator",
]);

const JUMP_TYPES = new Set([
  "BreakStatement",
  "ContinueStatement",
  "ReturnStatement",
  "ThrowStatement",
]);

const REPEATED_OPERAND_OPERATORS = new Set(["%", "&", "-", "/", "<<", ">>", ">>>", "??", "^", "|"]);

const SIDE_EFFECT_TYPES = new Set([
  "AssignmentExpression",
  "AwaitExpression",
  "CallExpression",
  "ImportExpression",
  "NewExpression",
  "TaggedTemplateExpression",
  "UpdateExpression",
  "YieldExpression",
]);

const NATIVELY_COMPARED_TYPES = new Set([
  "BinaryExpression",
  "ChainExpression",
  "Identifier",
  "Literal",
  "LogicalExpression",
  "MemberExpression",
  "ParenthesizedExpression",
  "PrivateIdentifier",
  "Super",
  "TemplateElement",
  "TemplateLiteral",
  "ThisExpression",
  "UnaryExpression",
]);

function codeKey(context: Context, nodes: readonly ESTree.Node[]) {
  return JSON.stringify(nodes.map((node) => [node.type, tokenValues(context, node)]));
}

function bodyLines(context: Context, body: ESTree.Node) {
  const tokens = context.sourceCode.getTokens(body);
  const inner = body.type === "BlockStatement" ? tokens.slice(1, -1) : tokens;
  const [first] = inner;
  const last = inner.at(-1);

  if (first === undefined || last === undefined) {
    return 0;
  }

  return last.loc.end.line - first.loc.start.line + 1;
}

function functionName(node: FunctionNode) {
  const { parent } = node;

  if (parent.type === "VariableDeclarator") {
    return parent.id;
  }

  if (
    parent.type === "MethodDefinition" ||
    parent.type === "Property" ||
    parent.type === "PropertyDefinition"
  ) {
    return parent.key;
  }

  return node.id ?? node;
}

function spansSeveralLines(statements: readonly ESTree.Node[]) {
  const [first] = statements;
  const last = statements.at(-1);

  return first !== undefined && last !== undefined && last.loc.end.line > first.loc.start.line;
}

function haveSameCode(branches: readonly Branch[]) {
  return branches.length > 1 && new Set(branches.map(({ key }) => key)).size === 1;
}

function reportRepeats(context: Context, branches: readonly Branch[], isUniform: boolean) {
  const seen = new Map<string, Branch>();

  for (const branch of branches) {
    const match = seen.get(branch.key);

    if (match === undefined || isUniform) {
      seen.set(branch.key, branch);
    }

    if (match !== undefined && (isUniform || spansSeveralLines(branch.statements))) {
      context.report({
        data: {
          kind: branch.node.type === "SwitchCase" ? "case" : "branch",
          line: match.node.loc.start.line,
        },
        messageId: "duplicatedBranch",
        node: branch.node,
      });
    }
  }
}

function toIfBranch(context: Context, node: ESTree.Statement) {
  const statements = node.type === "BlockStatement" ? node.body : [node];

  return { key: codeKey(context, statements), node, statements };
}

function checkIf(context: Context, node: ESTree.IfStatement) {
  const branches = [toIfBranch(context, node.consequent)];
  let { alternate } = node;

  while (alternate?.type === "IfStatement") {
    branches.push(toIfBranch(context, alternate.consequent));
    ({ alternate } = alternate);
  }

  if (alternate === null) {
    reportRepeats(context, branches, haveSameCode(branches));

    return;
  }

  branches.push(toIfBranch(context, alternate));

  if (haveSameCode(branches)) {
    context.report({ data: { kind: "if" }, messageId: "identicalBranches", node });

    return;
  }

  reportRepeats(context, branches, false);
}

function toCaseBranch(context: Context, node: ESTree.SwitchCase) {
  const [only, ...others] = node.consequent;
  const body = only?.type === "BlockStatement" && others.length === 0 ? only.body : node.consequent;
  const ending = body.at(-1);

  const statements = body.filter(
    (statement) => statement !== ending || statement.type !== "BreakStatement",
  );

  return {
    endsWithJump: ending !== undefined && JUMP_TYPES.has(ending.type),
    isLabelOnly: node.consequent.length === 0,
    key: codeKey(context, statements),
    node,
    statements,
  };
}

function checkSwitch(context: Context, node: ESTree.SwitchStatement) {
  const branches = node.cases.map((switchCase) => toCaseBranch(context, switchCase));
  const last = branches.at(-1);
  const filled = branches.filter(({ statements }) => statements.length > 0);

  const canFallThrough = branches.some(
    (branch) => branch !== last && !branch.isLabelOnly && !branch.endsWithJump,
  );

  if (node.cases.every(({ test }) => test !== null)) {
    reportRepeats(context, filled, !canFallThrough && haveSameCode(filled));

    return;
  }

  const groups = branches.filter(({ isLabelOnly }) => !isLabelOnly);

  if (last?.isLabelOnly === true) {
    groups.push(last);
  }

  if (!canFallThrough && haveSameCode(groups)) {
    context.report({ data: { kind: "switch" }, messageId: "identicalBranches", node });

    return;
  }

  reportRepeats(context, filled, false);
}

function hasComparableOperands(context: Context, { left, operator }: Operation) {
  const { visitorKeys } = context.sourceCode;
  const isLogical = operator === "&&" || operator === "||";

  if (
    (!isLogical && !REPEATED_OPERAND_OPERATORS.has(operator)) ||
    contains(visitorKeys, left, ({ type }) => SIDE_EFFECT_TYPES.has(type))
  ) {
    return false;
  }

  return (
    !isLogical ||
    contains(
      visitorKeys,
      left,
      ({ type }) => !NATIVELY_COMPARED_TYPES.has(type) && !type.startsWith("TS"),
    )
  );
}

function isBitFlag({ left, operator }: Operation) {
  return operator === "<<" && left.type === "Literal" && (left.value === 1 || left.value === 1n);
}

function checkOperands(context: Context, node: Operation) {
  const { left, operator, right } = node;

  if (
    !hasComparableOperands(context, node) ||
    isBitFlag(node) ||
    codeKey(context, [left]) !== codeKey(context, [right])
  ) {
    return;
  }

  context.report({ data: { operator }, messageId: "identicalOperands", node });
}

function checkFunction(context: Context, functions: Map<string, ESTree.Node>, node: FunctionNode) {
  const { body, parent, type } = node;

  if (
    (type !== "FunctionDeclaration" && !FUNCTION_OWNERS.has(parent.type)) ||
    body === null ||
    bodyLines(context, body) < MINIMUM_FUNCTION_LINES
  ) {
    return;
  }

  const key = codeKey(context, [body]);
  const original = functions.get(key);
  const name = functionName(node);

  if (original === undefined) {
    functions.set(key, name);

    return;
  }

  context.report({
    data: { line: original.loc.start.line },
    messageId: "identicalFunction",
    node: name,
  });
}

export const noDuplicatedLogic = defineRule({
  meta: {
    docs: {
      description:
        "Forbid identical functions, duplicated branches and identical operands on both sides of an operator.",
    },
    messages: {
      duplicatedBranch:
        "This {{kind}} repeats the code that line {{line}} already runs. Combine the two conditions, or fix the {{kind}} that should do something else.",
      identicalBranches:
        "Every branch of this {{kind}} runs the same code. Drop the {{kind}} and keep the code once, or fix the branch that should differ.",
      identicalFunction:
        "This function has the same body as the one on line {{line}}. Reuse that function instead of repeating it.",
      identicalOperands:
        'Both sides of "{{operator}}" are the same expression. Fix the side that should differ, or replace the expression with its result.',
      identicalTernary:
        "Both results of this ternary are the same. Use that value without the condition.",
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    let functions = new Map<string, ESTree.Node>();

    return {
      before() {
        functions = new Map();
      },
      ArrowFunctionExpression(node) {
        checkFunction(context, functions, node);
      },
      BinaryExpression(node) {
        checkOperands(context, node);
      },
      ConditionalExpression(node) {
        if (codeKey(context, [node.consequent]) === codeKey(context, [node.alternate])) {
          context.report({ messageId: "identicalTernary", node });
        }
      },
      FunctionDeclaration(node) {
        checkFunction(context, functions, node);
      },
      FunctionExpression(node) {
        checkFunction(context, functions, node);
      },
      IfStatement(node) {
        const { parent } = node;

        if (parent.type !== "IfStatement" || parent.alternate !== node) {
          checkIf(context, node);
        }
      },
      LogicalExpression(node) {
        checkOperands(context, node);
      },
      SwitchStatement(node) {
        checkSwitch(context, node);
      },
    };
  },
});
