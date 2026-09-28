import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

function isRequired(node: FunctionNode) {
  return node.body === null || node.returnType?.typeAnnotation.type === "TSTypePredicate";
}

export const noExplicitReturnType = defineRule({
  meta: {
    docs: { description: "Forbid return type annotations; let TypeScript infer them." },
    hasSuggestions: true,
    messages: {
      forbidden: "Remove the return type annotation and let TypeScript infer it.",
      remove: "Remove the return type annotation.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    function check(node: FunctionNode) {
      const { returnType } = node;

      if (returnType === null || returnType === undefined || isRequired(node)) {
        return;
      }

      context.report({
        messageId: "forbidden",
        node: returnType,
        suggest: [{ fix: (fixer) => fixer.remove(returnType), messageId: "remove" }],
      });
    }

    return {
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check,
    };
  },
});
