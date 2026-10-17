import { RuleTester } from "oxlint/plugins-dev";

import { tailwindTypography } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-typography",
  tailwindTypography,
  {
    invalid: [
      {
        code: '<p className="text-[10px]" />;',
        errors: [{ data: { className: "text-[10px]", px: "10" }, messageId: "tinyText" }],
      },
      {
        code: '<h1 className="text-9xl" />;',
        errors: [{ data: { className: "text-9xl", px: "128" }, messageId: "hugeText" }],
      },
      {
        code: '<h1 className="text-5xl tracking-tighter" />;',
        errors: [
          { data: { className: "tracking-tighter", em: "-0.05" }, messageId: "tightTracking" },
        ],
      },
      {
        code: '<p className="text-sm -tracking-widest" />;',
        errors: [
          { data: { className: "-tracking-widest", em: "-0.1" }, messageId: "tightTracking" },
        ],
      },
      {
        code: '<p className="tracking-widest" />;',
        errors: [{ data: { className: "tracking-widest", em: "0.1" }, messageId: "wideTracking" }],
      },
      {
        code: '<p className="text-sm tracking-[2px]" />;',
        errors: [{ messageId: "wideTracking" }],
      },
      {
        code: '<p className="text-xs tracking-[0.75px]" />;',
        errors: [
          { data: { className: "tracking-[0.75px]", em: "0.063" }, messageId: "wideTracking" },
        ],
      },
    ],
    valid: [
      '<p className="uppercase tracking-widest text-xs" />;',
      '<h1 className="text-8xl tracking-[-0.04em]" />;',
      '<span className="sr-only text-[10px]" />;',
      '<p className="text-[11px]/4" />;',
      '<p className="tracking-wider" />;',
    ],
  },
);
