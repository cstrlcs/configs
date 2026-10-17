import { RuleTester } from "oxlint/plugins-dev";

import { uiZoomable } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "ui-zoomable",
  uiZoomable,
  {
    invalid: [
      {
        code: '<meta name="viewport" content="width=device-width, maximum-scale=1" />;',
        errors: [{ messageId: "zoomDisabled" }],
      },
      {
        code: '<meta name="viewport" content="width=device-width, user-scalable=no" />;',
        errors: [{ messageId: "zoomDisabled" }],
      },
      {
        code: "export const viewport = { userScalable: false, maximumScale: 1, width: 'device-width' };",
        errors: [{ messageId: "zoomDisabled" }, { messageId: "zoomDisabled" }],
      },
      {
        code: "export const viewport = { maximumScale: 1 } satisfies Viewport;",
        errors: [{ messageId: "zoomDisabled" }],
      },
      {
        code: "export const viewport = { maximumScale: 1 } as const satisfies Viewport;",
        errors: [{ messageId: "zoomDisabled" }],
      },
      {
        code: "export const viewport = { userScalable: false } as Viewport;",
        errors: [{ messageId: "zoomDisabled" }],
      },
      {
        code: "<Text allowFontScaling={false}>Total</Text>;",
        errors: [{ messageId: "fixedFontScale" }],
      },
      {
        code: '<meta name="viewport" content="user-scalable=0" />;',
        errors: [{ messageId: "zoomDisabled" }],
      },
    ],
    valid: [
      '<meta name="viewport" content="width=device-width, initial-scale=1" />;',
      "export const viewport = { maximumScale: 5 };",
      "const viewport = { maximumScale: 1 };",
      '<meta name="viewport" content="width=device-width, maximum-scale=2" />;',
      "export const viewport = { maximumScale: 2 };",
      "<Text allowFontScaling>Total</Text>;",
    ],
  },
);
