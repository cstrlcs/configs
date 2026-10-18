import { RuleTester } from "oxlint/plugins-dev";

import { noRestrictedModulePaths } from "./rule.ts";

const BUILD_OUTPUT = [
  'import { formatInvoice } from "../dist/invoices.js";',
  'import "../../dist/styles/drawer.css";',
  'import * as bundle from "dist";',
  'import { createSession } from "./dist";',
  'export * from "./dist/orders/index.js";',
  'export { uploadFile } from "../../packages/uploads/dist/upload.js";',
  'const checkout = await import("./dist/checkout.js");',
  "const reports = await import(`../dist/reports.js`);",
  'const { renderReceipt } = require("../../dist");',
  "const mailer = require(`./dist/mailer.cjs`);",
  'import Billing = require("../dist/billing");',
];

const NODE_MODULES_PATHS = [
  'import { parse } from "../../node_modules/yaml/dist/index.js";',
  'import "../node_modules/normalize.css/normalize.css";',
  'const { z } = require("../node_modules/zod");',
  'require("../../node_modules/dotenv/config");',
  'import lodash from "/srv/shop/node_modules/lodash/lodash.js";',
  'import chalk from "node_modules/chalk";',
  'export * from "../node_modules/date-fns/dist/index.js";',
  'const pdf = await import("../../node_modules/pdf-lib");',
  "const sharp = await import(`../node_modules/sharp`);",
  'import express = require("../node_modules/express");',
  'export import Router = require("../../node_modules/express/router");',
];

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-restricted-module-paths",
  noRestrictedModulePaths,
  {
    invalid: [
      ...BUILD_OUTPUT.map((code) => ({ code, errors: [{ messageId: "dist" }] })),
      ...NODE_MODULES_PATHS.map((code) => ({ code, errors: [{ messageId: "nodeModules" }] })),
      {
        code: 'import { exportCsv } from "../dist/export.js";',
        errors: [{ data: { source: "../dist/export.js" }, messageId: "dist" }],
        filename: "src/binary-upload.ts",
      },
      {
        code: 'import Stripe = require("../node_modules/stripe");',
        errors: [{ data: { source: "../node_modules/stripe" }, messageId: "nodeModules" }],
      },
    ],
    valid: [
      'import { Temporal } from "temporal-polyfill";',
      'import "reflect-metadata";',
      'import "katex/dist/katex.min.css";',
      'import "@fontsource/inter/dist/inter.css";',
      'const { readConfig } = require("cosmiconfig");',
      'require("source-map-support/register");',
      'import { publish } from "./distribution";',
      'import { distance } from "./geo/dist-utils";',
      'import { Pipeline } from "@acme/dist";',
      'const manifest = loadJson("../node_modules/acme/package.json");',
      "const plugin = require(pluginPath);",
      "const locale = await import(localePath);",
      `const page = await import(\`./pages/\${slug}.js\`);`,
      `const legacy = require(\`../dist/\${name}.cjs\`);`,
      'import Stripe = require("stripe");',
      "import Currency = Billing.Currency;",
      'export { totalDue } from "./totals";',
      "export const RETRY_LIMIT = 3;",
      { code: 'import { main } from "../dist/cli.mjs";', filename: "bin/shop.ts" },
      { code: 'import { main } from "../dist/cli.mjs";', filename: "packages/importer/bin.mjs" },
    ],
  },
);
