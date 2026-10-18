import type { VisitorKeys } from "../shared/ast.ts";
import type { FunctionNode } from "../shared/functions.ts";
import type { Context, ESTree, Reference } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { contains, isWithin } from "../shared/ast.ts";
import { isFunctionExpression } from "../shared/functions.ts";

const MINIMUM_USES = 5;
const DECISION_TYPES = new Set(["ConditionalExpression", "LogicalExpression"]);
const CONTEXT_TYPES = new Set(["Super", "ThisExpression"]);
const EXPORT_TYPES = new Set(["ExportDefaultDeclaration", "ExportSpecifier"]);

function statementExpression(statement: ESTree.Statement | undefined) {
  if (statement?.type === "ExpressionStatement") {
    return statement.expression;
  }

  if (statement?.type !== "ReturnStatement") {
    return;
  }

  return statement.argument ?? undefined;
}

function bodyExpression({ body }: FunctionNode) {
  if (body?.type !== "BlockStatement") {
    return body ?? undefined;
  }

  const [statement, ...rest] = body.body;

  if (rest.length > 0) {
    return;
  }

  return statementExpression(statement);
}

function isDirectCall(identifier: ESTree.Node) {
  const { parent } = identifier;

  return parent?.type === "CallExpression" && parent.callee === identifier;
}

function usesFunctionContext(keys: VisitorKeys, expression: ESTree.Node) {
  return contains(
    keys,
    expression,
    (node) =>
      CONTEXT_TYPES.has(node.type) || (node.type === "Identifier" && node.name === "arguments"),
  );
}

function isPlain(context: Context, node: FunctionNode, expression: ESTree.Node) {
  return (
    !node.async &&
    !node.generator &&
    node.returnType?.typeAnnotation.type !== "TSTypePredicate" &&
    !usesFunctionContext(context.sourceCode.visitorKeys, expression)
  );
}

function isInlinable(context: Context, node: FunctionNode, expression: ESTree.Expression) {
  return (
    expression.parent.type !== "ExpressionStatement" &&
    node.params.every((parameter) => parameter.type === "Identifier") &&
    !context.sourceCode.getText(expression).includes("\n") &&
    !contains(context.sourceCode.visitorKeys, expression, (child) => DECISION_TYPES.has(child.type))
  );
}

function forwardedName(node: ESTree.Node) {
  if (node.type === "Identifier") {
    return node.name;
  }

  if (
    (node.type !== "RestElement" && node.type !== "SpreadElement") ||
    node.argument.type !== "Identifier"
  ) {
    return;
  }

  return `...${node.argument.name}`;
}

function memberRoot(expression: ESTree.Expression | ESTree.Super) {
  let root = expression;

  while (root.type === "MemberExpression") {
    root = root.object;
  }

  return root;
}

function isForwarding(node: FunctionNode, expression: ESTree.Expression) {
  const names = node.params.map((parameter) => forwardedName(parameter));

  if (names.includes(undefined)) {
    return false;
  }

  if (expression.type === "MemberExpression") {
    const root = memberRoot(expression);

    return root.type === "Identifier" && names.includes(root.name);
  }

  return (
    expression.type === "CallExpression" &&
    !expression.optional &&
    memberRoot(expression.callee).type === "Identifier" &&
    expression.arguments.length === names.length &&
    expression.arguments.every((argument, index) => forwardedName(argument) === names[index])
  );
}

function isModuleExports(target: ESTree.Node) {
  return (
    target.type === "MemberExpression" &&
    target.object.type === "Identifier" &&
    target.object.name === "module" &&
    target.property.type === "Identifier" &&
    target.property.name === "exports"
  );
}

function isExportsTarget(target: ESTree.Node) {
  if (target.type !== "MemberExpression") {
    return false;
  }

  const { object } = target;

  return (
    isModuleExports(target) ||
    isModuleExports(object) ||
    (object.type === "Identifier" && object.name === "exports")
  );
}

function isExported(identifier: Reference["identifier"]) {
  const { parent } = identifier;

  if (EXPORT_TYPES.has(parent.type)) {
    return true;
  }

  const exported =
    parent.type === "Property" && parent.value === identifier ? parent.parent : identifier;

  const assignment = exported.parent;

  return (
    assignment?.type === "AssignmentExpression" &&
    assignment.right === exported &&
    isExportsTarget(assignment.left)
  );
}

function isRarelyUsed(node: FunctionNode, reads: Reference[]) {
  const uses = reads.filter(
    ({ identifier }) =>
      !isWithin(identifier.range, node.range) && identifier.parent.type !== "TSTypeQuery",
  );

  const values = uses.filter(({ identifier }) => !isDirectCall(identifier));

  return (
    uses.length < MINIMUM_USES &&
    values.length <= 1 &&
    !uses.some(({ identifier }) => isExported(identifier))
  );
}

function isCalledOnceOutside(node: FunctionNode, reads: Reference[]) {
  const [only, ...rest] = reads;

  return (
    only !== undefined &&
    rest.length === 0 &&
    !isWithin(only.identifier.range, node.range) &&
    isDirectCall(only.identifier)
  );
}

function checkFunction(context: Context, declaration: ESTree.Node, node: FunctionNode) {
  const expression = bodyExpression(node);

  const variable = context.sourceCode
    .getDeclaredVariables(declaration)
    .find(({ defs }) =>
      defs.every(
        (definition) =>
          definition.type !== "Parameter" && definition.node.type !== "TSDeclareFunction",
      ),
    );

  if (expression === undefined || variable === undefined || !isPlain(context, node, expression)) {
    return;
  }

  const { name } = variable;
  const reads = variable.references.filter((reference) => reference.isRead());

  if (isCalledOnceOutside(node, reads) && isInlinable(context, node, expression)) {
    context.report({ data: { name }, messageId: "inline", node: declaration });

    return;
  }

  if (isForwarding(node, expression) && isRarelyUsed(node, reads)) {
    context.report({ data: { name }, messageId: "forward", node: declaration });
  }
}

function constantFunction({ id, init, parent }: ESTree.VariableDeclarator) {
  if (
    id.type !== "Identifier" ||
    parent.type !== "VariableDeclaration" ||
    parent.kind !== "const" ||
    parent.parent.type === "ExportNamedDeclaration" ||
    !isFunctionExpression(init)
  ) {
    return;
  }

  return init;
}

export const noTrivialFunctions = defineRule({
  meta: {
    docs: {
      description:
        "Forbid one-line functions called once and rarely used functions that only forward a call or read a property.",
    },
    messages: {
      forward:
        '"{{name}}" only forwards its parameters to a call or reads a property of one, and has fewer than five uses. Inline it.',
      inline:
        '"{{name}}" is a one-line function called only once. Inline its expression at the call site.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      FunctionDeclaration(node) {
        const { type } = node.parent;

        if (
          node.id !== null &&
          type !== "ExportNamedDeclaration" &&
          type !== "ExportDefaultDeclaration"
        ) {
          checkFunction(context, node, node);
        }
      },
      VariableDeclarator(node) {
        const init = constantFunction(node);

        if (init !== undefined) {
          checkFunction(context, node, init);
        }
      },
    };
  },
});
