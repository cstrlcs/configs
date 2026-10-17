import path from "node:path";
import { RuleTester } from "oxlint/plugins-dev";

import { noForbiddenDependencies } from "./rule.ts";

const SHARED_IS_THE_BOTTOM_LAYER = {
  comment: "shared must not reach up into an audience module.",
  from: { path: "^src/modules/shared/" },
  name: "shared-is-the-bottom-layer",
  to: { path: "^src/modules/(admin|owner|user)/" },
};

const NO_SIBLING_MODULES = {
  from: { path: "^src/modules/([^/]+)/" },
  name: "no-sibling-modules",
  to: { path: "^src/modules/[^/]+/", pathNot: ["^src/modules/$1/", "^src/modules/shared/"] },
};

const OWN_MODULE_ONLY = {
  from: { path: "^src/modules/([^/]+)/" },
  name: "own-module-only",
  to: { path: "^src/modules/$1/" },
};

const SIBLING_MESSAGE =
  'Dependency on "src/modules/admin/page.ts" is forbidden by "no-sibling-modules".';

new RuleTester({ cwd: path.join(import.meta.dirname, "fixtures", "project") }).run(
  "no-forbidden-dependencies",
  noForbiddenDependencies,
  {
    invalid: [
      {
        code: 'import { PAGE } from "../admin/page.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/admin/page.ts" is forbidden by "shared-is-the-bottom-layer". shared must not reach up into an audience module.',
          },
        ],
        filename: "src/modules/shared/date.ts",
        options: [SHARED_IS_THE_BOTTOM_LAYER],
      },
      {
        code: 'import { PAGE } from "../admin/page.ts";',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import { PAGE } from "@/modules/admin/page";',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import { PAGE } from "../admin/page.js";',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'export * from "../admin/page.ts";',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'export { PAGE } from "../admin/page.ts";',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'const loaded = import("../admin/page.ts");',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import type { PAGE } from "../admin/page.ts";',
        errors: [{ message: SIBLING_MESSAGE }],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import { PROFILE } from "./profile.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/user/profile.ts" is forbidden by "own-module-only".',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [OWN_MODULE_ONLY],
      },
      {
        code: 'import { readFile } from "node:fs";',
        errors: [{ message: 'Dependency on "node:fs" is forbidden by "no-node-builtins".' }],
        filename: "src/main.ts",
        options: [{ name: "no-node-builtins", to: { path: "^node:" } }],
      },
      {
        code: 'import "missing-package";',
        errors: [
          { message: 'Dependency on "missing-package" is forbidden by "no-missing-package".' },
        ],
        filename: "src/main.ts",
        options: [{ name: "no-missing-package", to: { path: "^missing-package$" } }],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        errors: [
          { message: 'Dependency on "src/modules/shared/format.ts" is forbidden by "no-modules".' },
        ],
        filename: "src/modules/user/settings.ts",
        options: [
          { name: "no-modules", to: { path: ["^src/modules/admin/", "^src/modules/shared/"] } },
        ],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/shared/format.ts" is forbidden by "audiences-skip-shared".',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [
          {
            from: { path: ["^src/modules/admin/", "^src/modules/user/"] },
            name: "audiences-skip-shared",
            to: { path: "^src/modules/shared/" },
          },
        ],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/shared/format.ts" is forbidden by "only-admin-uses-shared".',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [
          {
            from: { pathNot: "^src/modules/admin/" },
            name: "only-admin-uses-shared",
            to: { path: "^src/modules/shared/" },
          },
        ],
      },
    ],
    valid: [
      {
        code: 'import { PROFILE } from "./profile.ts";',
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import { PAGE } from "../admin/page.ts";',
        filename: "src/modules/user/settings.ts",
        options: [OWN_MODULE_ONLY],
      },
      {
        code: 'import { PAGE } from "../admin/page.ts";',
        filename: "src/modules/user/settings.ts",
        options: [SHARED_IS_THE_BOTTOM_LAYER],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        filename: "src/modules/admin/settings.ts",
        options: [
          {
            from: { pathNot: "^src/modules/admin/" },
            name: "only-admin-uses-shared",
            to: { path: "^src/modules/shared/" },
          },
        ],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        filename: "src/modules/user/settings.ts",
        options: [
          {
            from: { pathNot: ["^src/modules/admin/", "^src/modules/user/"] },
            name: "audiences-skip-shared",
            to: { path: "^src/modules/shared/" },
          },
        ],
      },
      {
        code: 'const { PAGE } = require("../admin/page.ts");',
        filename: "src/modules/shared/date.ts",
        options: [SHARED_IS_THE_BOTTOM_LAYER],
      },
      {
        code: 'const target = "../admin/page.ts";\nconst loaded = import(target);',
        filename: "src/modules/shared/date.ts",
        options: [SHARED_IS_THE_BOTTOM_LAYER],
      },
    ],
  },
);
