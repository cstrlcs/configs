import { RuleTester } from "oxlint/plugins-dev";

import { uiNoManualPlural } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "ui-no-manual-plural",
  uiNoManualPlural,
  {
    invalid: [
      {
        code: '<p>{count} {count === 1 ? "file" : "files"}</p>;',
        errors: [{ messageId: "manualPlural" }],
      },
      {
        code: '<p>{count} {count === 1 ? "box" : "boxes"}</p>;',
        errors: [{ messageId: "manualPlural" }],
      },
      {
        code: 'const suffix = count !== 1 ? "s" : "";',
        errors: [{ messageId: "manualPlural" }],
      },
    ],
    valid: [
      'const label = count === 1 ? "one" : "many";',
      'const label = count > 2 ? "files" : "file";',
    ],
  },
);
