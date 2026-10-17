import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindTypography = defineClassRule({
  analysis: "typography",
  meta: {
    docs: {
      description: "Keep text size and letter-spacing within readable bounds.",
    },
    messages: {
      hugeText: '"{{className}}" renders text at {{px}}px. Display type stops at 96px (6rem).',
      tightTracking:
        '"{{className}}" sets letter-spacing to {{em}}em. Keep tracking at -0.04em or looser.',
      tinyText:
        '"{{className}}" renders text at {{px}}px. Use 12px or more, or 11px for a functional label.',
      wideTracking:
        '"{{className}}" sets letter-spacing to {{em}}em on text that is not uppercase. Keep running text at 0.05em or less.',
    },
    type: "suggestion",
  },
});
