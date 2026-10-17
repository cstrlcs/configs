import type { ClassLiteral } from "../shared/class-literals.ts";
import type { TokenFinding } from "../shared/class-rule.ts";

import { defineClassRule } from "../shared/class-rule.ts";

function findConcatenated({ partial }: ClassLiteral) {
  return partial.map(
    (token) =>
      ({
        data: { className: token.value },
        messageId: "concatenated",
        token,
      }) satisfies TokenFinding<"concatenated">,
  );
}

export const tailwindNoConcatenatedClasses = defineClassRule({
  inspectTokens: findConcatenated,
  meta: {
    docs: {
      description:
        "Forbid class names built by concatenating a dynamic value, which Tailwind CSS cannot detect.",
    },
    messages: {
      concatenated:
        '"{{className}}" is concatenated with a dynamic value. Write each class name in full.',
    },
    type: "problem",
  },
});
