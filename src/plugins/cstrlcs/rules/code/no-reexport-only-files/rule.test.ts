import path from "node:path";
import { RuleTester } from "oxlint/plugins-dev";

import { noReexportOnlyFiles } from "./rule.ts";

const REEXPORT_ONLY = [
  'export * from "./button";',
  'export * as icons from "./icons";',
  'export { Button } from "./button";',
  'export { Button as default } from "./button";',
  'export type { ButtonProps } from "./button";',
  'export * from "./button";\nexport * from "./dialog";\nexport { Menu } from "./menu";',
  'import { Button } from "./button";\nexport { Button };',
  'import { Button } from "./button";\nimport { Dialog } from "./dialog";\nexport { Button, Dialog as Modal };',
  'import * as icons from "./icons";\nexport { icons };',
  'import Button from "./button";\nexport default Button;',
  'import type { ButtonProps } from "./button";\nexport type { ButtonProps };',
  'import "./polyfills";\nexport * from "./button";',
  '"use client";\nexport * from "./button";',
];

const MODULES_WITH_CODE = [
  'export * from "./button";\nexport const SIZES = ["sm", "lg"];',
  'export { Button } from "./button";\nexport function render() {}',
  'import { Button } from "./button";\nconst Primary = Button;\nexport { Primary };',
  'import { Button } from "./button";\nexport { Button };\nregister(Button);',
  'export * from "./button";\nrun();',
  'export * from "./button";\nexport default createTheme();',
  'export * from "./button";\nexport interface Theme { color: string }',
  "const Button = createButton();\nexport { Button };",
  'import { Button } from "./button";\nexport default Button;\nexport const VERSION = 1;',
  'import { Button } from "./button";',
  "export {};",
  "export default globalThis;",
  "",
];

function fixture(name: string, file: string) {
  return path.join(import.meta.dirname, "fixtures", name, file);
}

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-reexport-only-files",
  noReexportOnlyFiles,
  {
    invalid: [
      ...REEXPORT_ONLY.map((code) => ({
        code,
        errors: [{ messageId: "reexportOnly" }],
        filename: fixture("plain", "src/components/index.ts"),
      })),
      {
        code: 'import { Button } from "./button";\nexport { Button };',
        errors: [
          {
            line: 2,
            message:
              "This module only re-exports other modules. Import from the modules that define these exports instead.",
          },
        ],
        filename: fixture("plain", "src/index.ts"),
      },
      ...[
        "src/components/index.ts",
        "src/server.ts",
        "src/server/handler.ts",
        "src/index/button.ts",
        "dist/index.js",
      ].map((file) => ({
        code: 'export * from "./button";',
        errors: [{ messageId: "reexportOnly" }],
        filename: fixture("library", file),
      })),
      {
        code: 'export * from "./button";',
        errors: [{ messageId: "reexportOnly" }],
        filename: fixture("wildcard", "src/plugins/react.ts"),
      },
      {
        code: 'export * from "./button";',
        errors: [{ messageId: "reexportOnly" }],
        filename: fixture("single", "src/index.ts"),
      },
      {
        code: 'export * from "./button";',
        errors: [{ messageId: "reexportOnly" }],
        filename: fixture("built", "src/other.ts"),
      },
    ],
    valid: [
      ...MODULES_WITH_CODE.map((code) => ({
        code,
        filename: fixture("plain", "src/components/index.ts"),
      })),
      ...[
        "src/index.ts",
        "src/index.tsx",
        "src/index.js",
        "src/server/index.ts",
        "src/client.mts",
        "src/client-fallback.cts",
        "src/main.cts",
        "src/module.mts",
        "src/types.ts",
        "src/cli.ts",
      ].map((file) => ({
        code: 'export * from "./button";',
        filename: fixture("library", file),
      })),
      ...["plugins/react.ts", "plugins/vue/index.ts", "src/icons/arrow.ts"].map((file) => ({
        code: 'export * from "./button";',
        filename: fixture("wildcard", file),
      })),
      ...["index.ts", "bin/single.mts"].map((file) => ({
        code: 'export * from "./button";',
        filename: fixture("single", file),
      })),
      ...["src/index.ts", "src/utils/index.ts"].map((file) => ({
        code: 'export * from "./button";',
        filename: fixture("built", file),
      })),
      ...["src/components/index.d.ts", "src/globals.d.mts", "src/legacy.d.cts"].map((file) => ({
        code: 'export * from "./button";',
        filename: fixture("plain", file),
      })),
    ],
  },
);
