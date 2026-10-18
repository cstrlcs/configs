import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

const EM_DASH = /\u2014/gv;
const PLACEHOLDER = /^["'`]?\s*\u2014\s*["'`]?$/v;

function isPlaceholder(node: ESTree.Node, text: string) {
  if (!PLACEHOLDER.test(text)) {
    return false;
  }

  const { parent } = node;

  if (
    node.type !== "JSXText" ||
    (parent?.type !== "JSXElement" && parent?.type !== "JSXFragment")
  ) {
    return true;
  }

  return parent.children.every(
    (child) => child === node || (child.type === "JSXText" && child.value.trim() === ""),
  );
}

export const noEmDash = defineRule({
  meta: {
    docs: {
      description: "Forbid literal em dashes in strings, template literals, JSX text and regexes.",
    },
    messages: {
      emDash:
        "Em dashes are not allowed. Rephrase this text instead of swapping the dash for other punctuation.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      Program() {
        const { sourceCode } = context;
        const comments = sourceCode.getAllComments();

        const texts = [...sourceCode.text.matchAll(EM_DASH)]
          .filter(
            ({ index }) => !comments.some(({ range }) => index >= range[0] && index < range[1]),
          )
          .map(({ index }) => sourceCode.getNodeByRangeIndex(index))
          .filter((node) => node !== null)
          .filter((node) => !isPlaceholder(node, sourceCode.getText(node)));

        for (const node of new Map(texts.map((text) => [text.range[0], text])).values()) {
          context.report({ messageId: "emDash", node });
        }
      },
    };
  },
});
