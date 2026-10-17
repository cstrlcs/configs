import { RuleTester } from "oxlint/plugins-dev";

import { tailwindFocusAndReveal } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-focus-and-reveal",
  tailwindFocusAndReveal,
  {
    invalid: [
      {
        code: '<button className="focus-visible:outline-none focus-visible:ring-2" />;',
        errors: [
          {
            data: {
              className: "focus-visible:outline-none",
              replacement: "focus-visible:outline-hidden",
            },
            messageId: "hiddenOutline",
          },
        ],
        output: '<button className="focus-visible:outline-hidden focus-visible:ring-2" />;',
      },
      {
        code: '<button className="opacity-0 group-hover:opacity-100" />;',
        errors: [{ data: { className: "group-hover:opacity-100" }, messageId: "hoverOnlyReveal" }],
      },
      {
        code: '<div className="invisible hover:visible" />;',
        errors: [{ data: { className: "hover:visible" }, messageId: "hoverOnlyReveal" }],
      },
      {
        code: '<button className="focus-visible:outline-none! focus-visible:ring-2" />;',
        errors: [{ messageId: "hiddenOutline" }],
        output: '<button className="focus-visible:outline-hidden! focus-visible:ring-2" />;',
      },
    ],
    valid: [
      '<button className="outline-none focus-visible:outline-2 focus-visible:ring-2" />;',
      '<button className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" />;',
      '<button className="outline-none" />;',
      '<button className="outline-none ring-2" />;',
    ],
  },
);
