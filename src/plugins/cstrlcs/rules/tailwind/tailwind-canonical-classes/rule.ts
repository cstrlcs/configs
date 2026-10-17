import type { ClassLiteral } from "../shared/class-literals.ts";
import type { TokenFinding } from "../shared/class-rule.ts";

import { defineClassRule } from "../shared/class-rule.ts";

function findDuplicates({ classes }: ClassLiteral) {
  const seen = new Set<string>();

  return classes
    .filter((token) => {
      const isRepeated = seen.has(token.value);

      seen.add(token.value);

      return isRepeated;
    })
    .map(
      (token) =>
        ({
          data: { className: token.value },
          messageId: "duplicate",
          removes: true,
          token,
        }) satisfies TokenFinding<"duplicate">,
    );
}

export const tailwindCanonicalClasses = defineClassRule({
  analysis: "canonical",
  inspectTokens: findDuplicates,
  meta: {
    docs: {
      description:
        "Require the canonical Tailwind CSS v4 spelling of each class list: simplified values, theme names, no repeated or redundant classes, and media variants first.",
    },
    fixable: "code",
    messages: {
      canonical: '"{{classNames}}" should be written as "{{replacement}}".',
      duplicate: '"{{className}}" is repeated in the same class list.',
      redundant: '"{{className}}" is redundant: "{{cover}}" already applies it.',
    },
    type: "suggestion",
  },
});
