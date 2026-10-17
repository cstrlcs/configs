import { RuleTester } from "oxlint/plugins-dev";

import { tailwindContrast } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-contrast",
  tailwindContrast,
  {
    invalid: [
      {
        code: '<p className="text-gray-400 bg-white" />;',
        errors: [
          {
            data: {
              background: "bg-white",
              className: "text-gray-400",
              minimum: "4.5",
              ratio: "2.60",
            },
            messageId: "contrast",
          },
        ],
      },
      {
        code: '<h2 className="text-xl text-neutral-500 bg-black" />;',
        errors: [
          {
            data: {
              background: "bg-black",
              className: "text-neutral-500",
              minimum: "4.5",
              ratio: "4.44",
            },
            messageId: "contrast",
          },
        ],
      },
      { code: '<p className="md:text-gray-400 bg-white" />;', errors: [{ messageId: "contrast" }] },
      {
        code: '<p className="text-gray-400 bg-white hover:underline" />;',
        errors: [{ messageId: "contrast" }],
      },
    ],
    valid: [
      '<p className="text-sm text-gray-900 bg-white tracking-tight" />;',
      '<p className="text-white bg-gray-900 md:text-gray-900 md:bg-white" />;',
      '<h2 className="text-2xl text-neutral-500 bg-black" />;',
      '<h2 className="text-xl font-bold text-neutral-500 bg-black" />;',
    ],
  },
);
