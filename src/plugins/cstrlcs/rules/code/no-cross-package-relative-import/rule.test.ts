import path from "node:path";
import { RuleTester } from "oxlint/plugins-dev";

import { noCrossPackageRelativeImport } from "./rule.ts";

const APP_FILE = "packages/app/src/main.ts";

const CROSS_PACKAGE = [
  'import { Button } from "../../ui/src/button";',
  'import { Button } from "../../ui/src/button.ts";',
  'import { Button } from "../../ui";',
  'import config from "../../../tsconfig.base.json";',
  'import type { ButtonProps } from "../../ui/src/button";',
  'export { Button } from "../../ui/src/button";',
  'export * from "../../ui/src/index.ts";',
  'const ui = await import("../../ui/src/index.ts");',
  "const ui = await import(`../../ui/src/index.ts`);",
  'type Props = import("../../ui/src/button").ButtonProps;',
  'import { Button } from "./../../ui/src/button";',
];

new RuleTester({ cwd: path.join(import.meta.dirname, "fixtures", "workspace") }).run(
  "no-cross-package-relative-import",
  noCrossPackageRelativeImport,
  {
    invalid: [
      ...CROSS_PACKAGE.map((code) => ({
        code,
        errors: [{ messageId: "crossPackage" }],
        filename: APP_FILE,
      })),
      {
        code: 'import { Button } from "../../../ui/src/button";',
        errors: [
          {
            message:
              '"../../../ui/src/button" reaches outside this package. Depend on the package by name and import its exports instead.',
          },
        ],
        filename: "packages/app/src/routes/home.tsx",
      },
      {
        code: 'import { Button } from "../";',
        errors: [{ messageId: "crossPackage" }],
        filename: "packages/app/main.ts",
      },
      {
        code: 'import { run } from "../app/src/main.ts";',
        errors: [{ messageId: "crossPackage" }],
        filename: "packages/ui/build.ts",
      },
    ],
    valid: [
      ...[
        'import { Header } from "./header";',
        'import { Header } from "../components/header";',
        'import { Header } from "../src/components/header";',
        'import { Header } from "../../app/src/components/header";',
        'import manifest from "../package.json";',
        'import { Button } from "@workspace/ui";',
        'import { Button } from "@workspace/ui/button";',
        'import { readFile } from "node:fs";',
        'import { Header } from "@/components/header";',
        'import { Header } from "..header";',
        "const page = await import(pagePath);",
        `const page = await import(\`./pages/\${slug}.ts\`);`,
      ].map((code) => ({ code, filename: APP_FILE })),
      {
        code: 'import { Button } from "./packages/ui/src/button";',
        filename: "vitest.workspace.ts",
      },
    ],
  },
);
