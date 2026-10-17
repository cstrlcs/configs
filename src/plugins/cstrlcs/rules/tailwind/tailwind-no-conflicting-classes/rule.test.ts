import { RuleTester } from "oxlint/plugins-dev";

import { tailwindNoConflictingClasses } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-no-conflicting-classes",
  tailwindNoConflictingClasses,
  {
    invalid: [
      {
        code: '<div className="flex hidden" />;',
        errors: [
          {
            data: { className: "flex", others: "hidden", properties: "display" },
            messageId: "conflicting",
          },
          {
            data: { className: "hidden", others: "flex", properties: "display" },
            messageId: "conflicting",
          },
        ],
      },
      {
        code: '<div className="md:p-2 md:p-4" />;',
        errors: [{ messageId: "conflicting" }, { messageId: "conflicting" }],
      },
    ],
    valid: [
      '<div className="p-2 px-4 hover:flex hidden shadow-sm shadow-red-500" />;',
      '<div className="flex md:hidden" />;',
    ],
  },
);
