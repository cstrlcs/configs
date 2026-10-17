import { RuleTester } from "oxlint/plugins-dev";

import { tailwindNoIdleWillChange } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-no-idle-will-change",
  tailwindNoIdleWillChange,
  {
    invalid: [
      {
        code: '<div className="will-change-transform" />;',
        errors: [{ data: { className: "will-change-transform" }, messageId: "idleWillChange" }],
      },
    ],
    valid: [
      '<div className="blur-3xl will-change-transform" />;',
      '<div className="hover:will-change-transform" />;',
      '<div className="animate-spin will-change-transform" />;',
      '<div className="transition will-change-transform" />;',
      '<div className="will-change-auto" />;',
    ],
  },
);
