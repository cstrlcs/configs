import type { Context, ESTree, Range } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

type Parent = ESTree.JSXElement | ESTree.JSXFragment;

const LEAKED_SEMICOLONS = /^;+(?=[ \t]*(?:\r\n|\r|\n))/v;

function rendersNothing(child: ESTree.JSXChild) {
  if (child.type === "JSXText") {
    return child.value.trim() === "";
  }

  if (child.type !== "JSXExpressionContainer") {
    return false;
  }

  const { expression } = child;

  return (
    expression.type === "JSXEmptyExpression" ||
    (expression.type === "Literal" && expression.value === "") ||
    (expression.type === "TemplateLiteral" &&
      expression.expressions.length === 0 &&
      expression.quasis.every((quasi) => quasi.value.raw === ""))
  );
}

function isTemplateLeftover({ children }: Parent, index: number, text: string) {
  const expression = children[index + 1];

  if (!text.endsWith("$") || expression?.type !== "JSXExpressionContainer") {
    return false;
  }

  const rendered = children.filter((child) => child !== expression && !rendersNothing(child));

  return text.trim() !== "$" || rendered.length > 1;
}

function reportLeak(context: Context, leak: "leakedDollar" | "leakedSemicolon", range: Range) {
  const { sourceCode } = context;

  context.report({
    loc: { end: sourceCode.getLocFromIndex(range[1]), start: sourceCode.getLocFromIndex(range[0]) },
    messageId: leak,
    suggest: [
      {
        fix: (fixer) => fixer.removeRange(range),
        messageId: leak === "leakedDollar" ? "removeDollar" : "removeSemicolons",
      },
    ],
  });
}

function inspectText(context: Context, parent: Parent, index: number) {
  const child = parent.children[index];

  if (child?.type !== "JSXText") {
    return;
  }

  const text = context.sourceCode.getText(child);
  const [start, end] = child.range;
  const semicolons = LEAKED_SEMICOLONS.exec(text)?.[0];

  if (semicolons !== undefined) {
    reportLeak(context, "leakedSemicolon", [start, start + semicolons.length]);
  }

  if (isTemplateLeftover(parent, index, text)) {
    reportLeak(context, "leakedDollar", [end - 1, end]);
  }
}

export const reactNoLeakedText = defineRule({
  meta: {
    docs: {
      description:
        "Forbid JSX text that renders by accident: a $ left before an expression and a ; that opens a text node before a line break.",
    },
    hasSuggestions: true,
    messages: {
      leakedDollar:
        'This "$" renders as text, likely left over from a template literal. Remove it, or write {"$"} when the sign is intended.',
      leakedSemicolon:
        'This ";" renders as text, likely left over from the end of a statement. Remove it.',
      removeDollar: 'Remove the "$".',
      removeSemicolons: 'Remove the ";".',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    function inspectChildren(node: Parent) {
      for (const index of node.children.keys()) {
        inspectText(context, node, index);
      }
    }

    return { JSXElement: inspectChildren, JSXFragment: inspectChildren };
  },
});
