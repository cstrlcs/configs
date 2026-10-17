import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindNoIdleWillChange = defineClassRule({
  analysis: "willChange",
  meta: {
    docs: {
      description: "Forbid will-change on an element that neither animates nor blurs.",
    },
    messages: {
      idleWillChange:
        '"{{className}}" sets will-change on an element that neither animates nor blurs. Add it only to the animating element, after measuring a problem.',
    },
    type: "suggestion",
  },
});
