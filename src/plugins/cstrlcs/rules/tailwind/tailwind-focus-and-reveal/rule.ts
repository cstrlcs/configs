import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindFocusAndReveal = defineClassRule({
  analysis: "focusAndReveal",
  meta: {
    docs: {
      description:
        "Keep focus visible in forced colors mode, and reveal hover-only content on focus too.",
    },
    fixable: "code",
    messages: {
      hiddenOutline:
        '"{{className}}" removes the outline in forced colors mode, where the focus ring is not painted. Use "{{replacement}}".',
      hoverOnlyReveal:
        '"{{className}}" reveals hidden content on hover only. Reveal it on focus too (focus-visible:, group-focus-within:) and give touch a path.',
    },
    type: "suggestion",
  },
});
