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

const USER_LAYER = {
  allow: { path: ["^src/modules/user/", "^src/modules/shared/", "^node:"] },
  comment: "user builds only on shared and Node.",
  from: { path: "^src/modules/user/" },
  name: "user-layer",
};

const OWN_MODULE_ALLOWED = {
  allow: { path: "^src/modules/$1/" },
  from: { path: "^src/modules/([^/]+)/" },
  name: "own-module-allowed",
};

const NO_HONO = { name: "no-hono", to: { path: "^node_modules/hono/" } };
const HONO_MESSAGE = 'Dependency on "node_modules/hono/dist/index.js" is forbidden by "no-hono".';

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
        code: 'import { readFile } from "fs";',
        errors: [{ message: 'Dependency on "node:fs" is forbidden by "no-node-builtins".' }],
        filename: "src/main.ts",
        options: [{ name: "no-node-builtins", to: { path: "^node:" } }],
      },
      {
        code: 'import { HONO } from "hono";',
        errors: [{ message: HONO_MESSAGE }],
        filename: "src/main.ts",
        options: [NO_HONO],
      },
      {
        code: 'import { HONO } from "hono";',
        errors: [{ message: HONO_MESSAGE }],
        filename: "packages/app/src/main.ts",
        options: [NO_HONO],
      },
      {
        code: 'import { NAME } from "@scope/name";',
        errors: [
          {
            message:
              'Dependency on "node_modules/@scope/name/index.js" is forbidden by "no-scope".',
          },
        ],
        filename: "src/main.ts",
        options: [{ name: "no-scope", to: { path: "^node_modules/@scope/" } }],
      },
      {
        code: 'import "missing-package";',
        errors: [
          {
            message:
              'Dependency on "node_modules/missing-package/" is forbidden by "no-missing-package".',
          },
        ],
        filename: "src/main.ts",
        options: [{ name: "no-missing-package", to: { path: "^node_modules/missing-package/" } }],
      },
      {
        code: 'import "@scope/missing/sub";',
        errors: [
          {
            message: 'Dependency on "node_modules/@scope/missing/sub/" is forbidden by "no-scope".',
          },
        ],
        filename: "src/main.ts",
        options: [{ name: "no-scope", to: { path: "^node_modules/@scope/" } }],
      },
      {
        code: 'import { MISSING } from "../admin/missing.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/admin/missing.ts" is forbidden by "no-sibling-modules".',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [NO_SIBLING_MODULES],
      },
      {
        code: 'import { PAGE } from "../admin/page.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/admin/page.ts" is not allowed by "user-layer". user builds only on shared and Node.',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [USER_LAYER],
      },
      {
        code: 'import { HONO } from "hono";',
        errors: [
          {
            message:
              'Dependency on "node_modules/hono/dist/index.js" is not allowed by "user-layer". user builds only on shared and Node.',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [USER_LAYER],
      },
      {
        code: 'import "missing-package";',
        errors: [
          {
            message:
              'Dependency on "node_modules/missing-package/" is not allowed by "user-layer". user builds only on shared and Node.',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [USER_LAYER],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/shared/format.ts" is not allowed by "own-module-allowed".',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [OWN_MODULE_ALLOWED],
      },
      {
        code: 'import { FORMAT } from "../shared/format.ts";',
        errors: [
          {
            message:
              'Dependency on "src/modules/shared/format.ts" is not allowed by "modules-except-shared".',
          },
        ],
        filename: "src/modules/user/settings.ts",
        options: [
          {
            allow: { path: "^src/modules/", pathNot: "^src/modules/shared/" },
            from: { path: "^src/modules/user/" },
            name: "modules-except-shared",
          },
        ],
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
        code: 'import { PROFILE } from "./profile.ts";\nimport { FORMAT } from "../shared/format.ts";\nimport { readFile } from "node:fs";',
        filename: "src/modules/user/settings.ts",
        options: [USER_LAYER],
      },
      {
        code: 'import { PROFILE } from "./profile.ts";',
        filename: "src/modules/user/settings.ts",
        options: [OWN_MODULE_ALLOWED],
      },
      {
        code: 'import { HONO } from "hono";',
        filename: "src/modules/admin/settings.ts",
        options: [USER_LAYER],
      },
      {
        code: 'import { NAME } from "@scope/name";',
        filename: "src/main.ts",
        options: [NO_HONO],
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
