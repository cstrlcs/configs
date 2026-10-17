import { RuleTester } from "oxlint/plugins-dev";

import { tailwindThemeTokens } from "./rule.ts";

const filename = `${import.meta.dirname}/fixtures/project/src/App.tsx`;

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-theme-tokens",
  tailwindThemeTokens,
  {
    invalid: [
      {
        code: '<div className="bg-[#123456] rounded-[3px] font-[Inter] text-[13px]" />;',
        errors: [
          { data: { className: "bg-[#123456]", kind: "color" }, messageId: "offTheme" },
          { data: { className: "rounded-[3px]", kind: "radius" }, messageId: "offTheme" },
          { data: { className: "font-[Inter]", kind: "font family" }, messageId: "offTheme" },
          { data: { className: "text-[13px]", kind: "font size" }, messageId: "offTheme" },
        ],
      },
      {
        code: '<p className="text-[14px]" />;',
        errors: [{ data: { className: "text-[14px]", size: "sm" }, messageId: "themeSize" }],
      },
      {
        code: '<p className="text-[10px]" />;',
        errors: [{ messageId: "offTheme" }],
      },
      {
        code: '<p className="text-[11px]/4" />;',
        errors: [
          { data: { className: "text-[11px]/4", kind: "font size" }, messageId: "offTheme" },
        ],
      },
      {
        code: '<p className="text-[15px]" />;',
        errors: [{ data: { className: "text-[15px]", size: "body" }, messageId: "themeSize" }],
        filename,
      },
      {
        code: '<div className="p-3.25 -mt-[7px]" />;',
        errors: [
          { data: { className: "p-3.25", px: "13" }, messageId: "offScaleSpacing" },
          { messageId: "offScaleSpacing" },
        ],
      },
      {
        code: '<svg className="fill-[#123456]" />;',
        errors: [{ data: { className: "fill-[#123456]", kind: "color" }, messageId: "offTheme" }],
      },
      { code: '<div className="from-[#123456]" />;', errors: [{ messageId: "offTheme" }] },
      { code: '<div className="bg-[rgb(1,2,3)]" />;', errors: [{ messageId: "offTheme" }] },
      { code: '<div className="[color:#123456]" />;', errors: [{ messageId: "offTheme" }] },
      { code: '<div className="gap-[7px]" />;', errors: [{ messageId: "offScaleSpacing" }] },
    ],
    valid: [
      '<div className="rounded-[9999px] bg-(--brand) text-[14px]/6" />;',
      '<div className="p-1.5 -mt-px gap-2.5" />;',
    ],
  },
);
