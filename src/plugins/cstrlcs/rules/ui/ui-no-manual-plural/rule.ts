import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

function isPluralPair(branches: ESTree.Expression[]) {
  const words = branches.map((branch) =>
    branch.type === "Literal" && typeof branch.value === "string" ? branch.value : undefined,
  );

  const [singular, plural] = words.toSorted(
    (first = "", second = "") => first.length - second.length,
  );

  return (
    singular !== undefined &&
    plural !== undefined &&
    [`${singular}s`, `${singular}es`].includes(plural)
  );
}

function comparesWithOne(test: ESTree.Expression) {
  return (
    test.type === "BinaryExpression" &&
    [test.left, test.right].some((side) => side.type === "Literal" && side.value === 1)
  );
}

export const uiNoManualPlural = defineRule({
  meta: {
    docs: {
      description: "Forbid pluralizing by appending s or es to a word in a ternary.",
    },
    messages: {
      manualPlural:
        "Pluralize with Intl.PluralRules or the i18n library. Adding an s holds only in some languages.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      ConditionalExpression(node) {
        if (comparesWithOne(node.test) && isPluralPair([node.consequent, node.alternate])) {
          context.report({ messageId: "manualPlural", node });
        }
      },
    };
  },
});
