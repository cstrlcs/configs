import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindContrast = defineClassRule({
  analysis: "contrast",
  meta: {
    docs: {
      description:
        "Require WCAG AA contrast between a text and a background color set in the same class list.",
    },
    messages: {
      contrast:
        '"{{className}}" on "{{background}}" has a contrast of {{ratio}}:1, below the {{minimum}}:1 WCAG AA minimum.',
    },
    type: "suggestion",
  },
});
