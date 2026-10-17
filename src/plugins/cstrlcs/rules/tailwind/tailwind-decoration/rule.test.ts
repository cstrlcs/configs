import { RuleTester } from "oxlint/plugins-dev";

import { tailwindDecoration } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-decoration",
  tailwindDecoration,
  {
    invalid: [
      {
        code: '<h1 className="bg-clip-text text-transparent bg-linear-to-r from-red-500 to-blue-500" />;',
        errors: [{ data: { className: "bg-clip-text" }, messageId: "gradientText" }],
      },
      {
        code: '<div className="bg-[repeating-linear-gradient(45deg,black_0_1px,transparent_1px_8px)]" />;',
        errors: [
          {
            data: {
              className: "bg-[repeating-linear-gradient(45deg,black_0_1px,transparent_1px_8px)]",
              pattern: "stripes",
            },
            messageId: "decorativePattern",
          },
        ],
      },
      {
        code: '<div className="shadow-[0_0_24px_var(--color-sky-400)]" />;',
        errors: [{ messageId: "glow" }],
      },
      {
        code: '<div className="rounded-lg border-l-4 border-red-500" />;',
        errors: [{ data: { className: "border-l-4" }, messageId: "sideStripe" }],
      },
      {
        code: '<div className="bg-[linear-gradient(to_right,gray_1px,transparent_1px),linear-gradient(to_bottom,gray_1px,transparent_1px)] bg-size-[24px_24px]" />;',
        errors: [
          {
            data: {
              className:
                "bg-[linear-gradient(to_right,gray_1px,transparent_1px),linear-gradient(to_bottom,gray_1px,transparent_1px)]",
              pattern: "grid lines",
            },
            messageId: "decorativePattern",
          },
        ],
      },
      {
        code: '<div className="rounded-lg border-l-2 border-red-500" />;',
        errors: [{ messageId: "sideStripe" }],
      },
      {
        code: '<div className="shadow-[0_1px_2px_black,0_0_24px_red]" />;',
        errors: [{ messageId: "glow" }],
      },
    ],
    valid: [
      '<div className="shadow-lg shadow-[0_0_0_1px_black]" />;',
      '<div className="rounded-lg border-l-4 border-gray-300" />;',
      '<blockquote className="border-l-4 border-red-500" />;',
      '<div className="rounded-lg border-4 border-red-500" />;',
      '<h1 className="bg-clip-text bg-linear-to-r from-red-500 to-blue-500 text-gray-900" />;',
      '<div className="rounded-lg border-l border-red-500" />;',
    ],
  },
);
