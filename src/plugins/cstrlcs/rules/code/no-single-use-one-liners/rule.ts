import type { VisitorKeys } from "../shared/ast.ts";
import type { Context, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { contains } from "../shared/ast.ts";

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

const DECISION_TYPES = new Set(["ConditionalExpression", "LogicalExpression"]);
const CONTEXT_TYPES = new Set(["Super", "ThisExpression"]);

function returnedExpression({ body }: FunctionNode) {
  if (body?.type !== "BlockStatement") {
    return body ?? undefined;
  }

  const [statement, ...rest] = body.body;

  if (statement?.type !== "ReturnStatement" || rest.length > 0) {
    return;
  }

  return statement.argument ?? undefined;
}

function usesFunctionContext(keys: VisitorKeys, expression: ESTree.Node) {
  return contains(
    keys,
    expression,
    (node) =>
      CONTEXT_TYPES.has(node.type) || (node.type === "Identifier" && node.name === "arguments"),
  );
}

function isInlinable(context: Context, node: FunctionNode, expression: ESTree.Node) {
  const { visitorKeys } = context.sourceCode;

  return (
    !node.async &&
    !node.generator &&
    node.returnType?.typeAnnotation.type !== "TSTypePredicate" &&
    node.params.every((parameter) => parameter.type === "Identifier") &&
    !context.sourceCode.getText(expression).includes("\n") &&
    !contains(visitorKeys, expression, (child) => DECISION_TYPES.has(child.type)) &&
    !usesFunctionContext(visitorKeys, expression)
  );
}

function isSingleDirectCall(variable: ESTree.Node | undefined, node: FunctionNode) {
  if (variable?.type !== "Identifier") {
    return false;
  }

  const { parent } = variable;
  const [start, end] = node.range;
  const isInside = variable.range[0] >= start && variable.range[1] <= end;

  return !isInside && parent.type === "CallExpression" && parent.callee === variable;
}

function checkFunction(context: Context, declaration: ESTree.Node, node: FunctionNode) {
  const expression = returnedExpression(node);

  if (expression === undefined || !isInlinable(context, node, expression)) {
    return;
  }

  for (const variable of context.sourceCode.getDeclaredVariables(declaration)) {
    const reads = variable.references.filter((reference) => reference.isRead());
    const [only] = reads;

    if (reads.length === 1 && isSingleDirectCall(only?.identifier, node)) {
      context.report({ data: { name: variable.name }, messageId: "inline", node: declaration });
    }
  }
}

function isFunctionExpression(node: ESTree.Expression | null): node is FunctionNode {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
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

export const noSingleUseOneLiners = defineRule({
  meta: {
    docs: {
      description:
        "Forbid one-line functions that are called once and can be replaced by their expression.",
    },
    messages: {
      inline:
        '"{{name}}" is a one-line function called only once. Inline its expression at the call site.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      FunctionDeclaration(node) {
        if (node.id !== null && node.parent.type !== "ExportNamedDeclaration") {
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
