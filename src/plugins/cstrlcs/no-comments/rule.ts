import type { Comment } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const DIRECTIVES = [
  /^(?:oxlint|eslint)-(?:disable|enable)\b/v,
  /^@ts-(?:check|expect-error|ignore|nocheck)\b/v,
  /^\/\s*<reference\b/v,
];

function isAllowed(comment: Comment) {
  if (comment.type === "Shebang") {
    return true;
  }

  if (comment.type === "Block" && /^[*!]/v.test(comment.value)) {
    return true;
  }

  const value = comment.value.trim();

  return DIRECTIVES.some((directive) => directive.test(value));
}

export const noComments = defineRule({
  meta: {
    docs: { description: "Forbid comments; the code itself should explain what it does." },
    messages: {
      forbidden: "Comments are not allowed. Express the intent through names and structure.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!isAllowed(comment)) {
            context.report({ messageId: "forbidden", node: comment });
          }
        }
      },
    };
  },
});
