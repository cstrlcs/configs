import { defineClassRule } from "../shared/class-rule.ts";

export const tailwindThemeTokens = defineClassRule({
  analysis: "themeTokens",
  meta: {
    docs: {
      description:
        "Keep colors, radii, fonts, font sizes and spacing on the theme's tokens and scale.",
    },
    messages: {
      offScaleSpacing:
        '"{{className}}" spaces by {{px}}px, off the 4px scale. Use a multiple of 4px, or a 2px half step.',
      offTheme:
        '"{{className}}" uses a {{kind}} the theme does not define. Use a theme token, or add one to @theme.',
      themeSize:
        '"{{className}}" has the size of "text-{{size}}", which also sets line-height. Use "text-{{size}}", or "text-{{size}}/<leading>".',
    },
    type: "suggestion",
  },
});
