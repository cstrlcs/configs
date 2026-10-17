import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindNoUnknownClasses = defineClassRule({
  analysis: "unknown",
  meta: {
    docs: {
      description: "Forbid classes the project's Tailwind CSS design system does not generate.",
    },
    messages: {
      unknown: '"{{className}}" is not a Tailwind CSS class.',
    },
    type: "problem",
  },
});
