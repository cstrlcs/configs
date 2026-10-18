import { RuleTester } from "oxlint/plugins-dev";

import { noExportAssignment } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-export-assignment",
  noExportAssignment,
  {
    invalid: [
      { code: "const value = 1;\n\nexport = value;", errors: [{ messageId: "exportAssignment" }] },
      {
        code: "export = { run };",
        errors: [{ messageId: "exportAssignment" }],
        filename: "src/index.cts",
      },
      {
        code: "class Client {}\n\nexport = Client;",
        errors: [{ messageId: "exportAssignment" }],
        filename: "src/client.mts",
      },
    ],
    valid: [
      "const value = 1;\n\nexport default value;",
      "export const value = 1;",
      'import value = require("value");',
      'declare module "legacy" {\n  function run(): void;\n\n  export = run;\n}',
      { code: "declare const value: number;\n\nexport = value;", filename: "src/value.d.ts" },
      { code: "declare const value: number;\n\nexport = value;", filename: "src/value.d.cts" },
      { code: "declare const value: number;\n\nexport = value;", filename: "src/value.d.mts" },
    ],
  },
);
