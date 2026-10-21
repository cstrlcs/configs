import type { Comment, ESTree, Options } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const LINT_DIRECTIVE = /^(?:oxlint|eslint)-(?:disable|enable)\b/v;
const DIRECTIVES = [/^@ts-(?:check|expect-error|ignore|nocheck)\b/v, /^\/\s*<reference\b/v];
const LEADING_WHITESPACE = /\s*/vy;

function isAllowed(comment: Comment) {
  if (comment.type === "Shebang") {
    return true;
  }

  if (comment.type === "Block" && comment.value.startsWith("!")) {
    return true;
  }

  const value = comment.value.trim();

  return DIRECTIVES.some((directive) => directive.test(value));
}

function allowsExportedDocs(options: Readonly<Options>) {
  const [option] = options;

  return (
    typeof option === "object" &&
    option !== null &&
    !Array.isArray(option) &&
    option["allowExportedDocs"] === true
  );
}

function memberStarts(
  declaration: ESTree.ExportDefaultDeclarationKind | ESTree.ExportNamedDeclaration["declaration"],
) {
  if (declaration?.type === "ClassDeclaration") {
    return declaration.body.body.map((member) => member.start);
  }

  if (declaration?.type === "TSInterfaceDeclaration") {
    return declaration.body.body.map((member) => member.start);
  }

  return [];
}

export const noComments = defineRule({
  meta: {
    docs: { description: "Forbid comments; the code itself should explain what it does." },
    messages: {
      disableDirective:
        "Inline disable directives are not allowed. Fix the code, or turn the rule off for those files in oxlint.config.ts.",
      forbidden: "Comments are not allowed. Express the intent through names and structure.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: { allowExportedDocs: { type: "boolean" } },
        type: "object",
      },
    ],
    type: "suggestion",
  },
  createOnce(context) {
    let canDocumentExports = false;
    let documentedStarts = new Set<number>();

    function documentExport(node: ESTree.ExportDefaultDeclaration | ESTree.ExportNamedDeclaration) {
      if (!canDocumentExports) {
        return;
      }

      documentedStarts.add(node.start);

      for (const start of memberStarts(node.declaration)) {
        documentedStarts.add(start);
      }
    }

    function isExportedDoc(comment: Comment) {
      if (comment.type !== "Block" || !comment.value.startsWith("*")) {
        return false;
      }

      LEADING_WHITESPACE.lastIndex = comment.end;
      LEADING_WHITESPACE.exec(context.sourceCode.text);

      return documentedStarts.has(LEADING_WHITESPACE.lastIndex);
    }

    function messageIdOf(comment: Comment) {
      if (LINT_DIRECTIVE.test(comment.value.trim())) {
        return "disableDirective";
      }

      if (isAllowed(comment) || isExportedDoc(comment)) {
        return;
      }

      return "forbidden";
    }

    return {
      before() {
        canDocumentExports = allowsExportedDocs(context.options);
        documentedStarts = new Set();
      },
      ExportDefaultDeclaration: documentExport,
      ExportNamedDeclaration: documentExport,
      "Program:exit"() {
        for (const comment of context.sourceCode.getAllComments()) {
          const messageId = messageIdOf(comment);

          if (messageId !== undefined) {
            context.report({ messageId, node: comment });
          }
        }
      },
    };
  },
});
