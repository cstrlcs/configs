import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindNoConflictingClasses = defineClassRule({
  analysis: "conflicting",
  meta: {
    docs: {
      description:
        "Forbid classes in one list that set the same CSS properties under the same variants.",
    },
    messages: {
      conflicting: '"{{className}}" conflicts with "{{others}}" on {{properties}}.',
    },
    type: "problem",
  },
});
