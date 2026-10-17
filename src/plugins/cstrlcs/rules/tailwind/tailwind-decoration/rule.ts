import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindDecoration = defineClassRule({
  analysis: "decoration",
  meta: {
    docs: {
      description:
        "Forbid decorative glows, gradient text, background patterns and colored side stripes.",
    },
    messages: {
      decorativePattern:
        '"{{className}}" draws decorative {{pattern}}. Keep them for a canvas, map, chart, editor or measuring tool.',
      glow: '"{{className}}" casts a shadow without offset, a glow or halo. Give the shadow an offset and a soft blur.',
      gradientText:
        '"{{className}}" fills transparent text with a gradient. Give text a solid color and take emphasis from weight or size.',
      sideStripe:
        '"{{className}}" draws a colored stripe on one side of a rounded box. Use a tint, an icon or a full border instead.',
    },
    type: "suggestion",
  },
});
