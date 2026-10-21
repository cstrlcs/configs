import path from "node:path";
import { RuleTester } from "oxlint/plugins-dev";

import { noTestCodeInProduction } from "./rule.ts";

const TEST_PACKAGES = [
  'import { vi } from "vitest";',
  'import { defineConfig } from "vitest/config";',
  'import { coverageConfigDefaults } from "@vitest/coverage-v8";',
  'import { mock } from "bun:test";',
  'import { render } from "@testing-library/react";',
  'import { userEvent } from "@testing-library/user-event";',
  'import { http } from "msw";',
  'import { setupServer } from "msw/node";',
  'import { expect } from "@playwright/test";',
  'import { chromium } from "playwright";',
  'import fc from "fast-check";',
  'import { test } from "@fast-check/vitest";',
  'import { GenericContainer } from "testcontainers";',
  'import { PostgreSqlContainer } from "@testcontainers/postgresql";',
  'import type { Mock } from "vitest";',
  'import { type Mock } from "vitest";',
  'export { vi } from "vitest";',
  'export * from "@testing-library/react";',
  'export type { Page } from "@playwright/test";',
  'const msw = await import("msw");',
  "const fc = await import(`fast-check`);",
  'type Spy = import("vitest").Mock;',
];

const TEST_MODULES = [
  'import { DATABASE } from "./__mocks__/database.ts";',
  'import { DATABASE } from "./__mocks__/database";',
  'import { FACTORY } from "./tests/factory.js";',
  'import { FACTORY } from "@/tests/factory";',
  'import { DATABASE } from "@/__mocks__/database";',
  'import { seed } from "./user.test";',
  'import { seed } from "./user.spec.ts";',
  'import { seed } from "./user_test.ts";',
  'import { renderPage } from "./test-utils";',
  'import { USERS } from "../fixtures/users.json";',
  'import { USERS } from "./__fixtures__/users";',
  'import { setup } from "../__tests__/setup";',
  'export { FACTORY } from "./tests/factory";',
  'export * from "./__mocks__/database";',
  'const { FACTORY } = await import("./tests/factory");',
];

const PRODUCTION_FILE = "src/service.ts";

new RuleTester({ cwd: path.join(import.meta.dirname, "fixtures", "project") }).run(
  "no-test-code-in-production",
  noTestCodeInProduction,
  {
    invalid: [
      ...TEST_PACKAGES.map((code) => ({
        code,
        errors: [{ messageId: "testPackage" }],
        filename: PRODUCTION_FILE,
      })),
      ...TEST_MODULES.map((code) => ({
        code,
        errors: [{ messageId: "testModule" }],
        filename: PRODUCTION_FILE,
      })),
      {
        code: 'import { vi } from "vitest";',
        errors: [{ message: '"vitest" is a test-only package. Keep it out of production code.' }],
        filename: "src/routes/index.tsx",
      },
      {
        code: 'import { FACTORY } from "./tests/factory";',
        errors: [
          {
            message:
              '"./tests/factory" is test code. Move what production needs out of the test, fixture or mock files.',
          },
        ],
        filename: "src/testing.ts",
      },
      {
        code: 'import { vi } from "vitest";',
        errors: [{ messageId: "testPackage" }],
        filename: "src/contest/entry.ts",
      },
    ],
    valid: [
      ...[
        'import { USERS } from "./users";',
        'import { USERS } from "@/users";',
        'import { readFile } from "node:fs";',
        'import { z } from "zod";',
        'import { vitestPlugin } from "vitest-plugin-helpers";',
        'import { config } from "@vitest-tools/config";',
        'import { playwrightConfig } from "playwright-config";',
        'import { checkout } from "./testimonials/checkout";',
        'import { latest } from "./latest";',
        'import { contest } from "./contest.ts";',
        'import { route } from "./test/route";',
        'import { flow } from "./e2e/flow";',
        "const loaded = await import(modulePath);",
      ].map((code) => ({ code, filename: PRODUCTION_FILE })),
      ...[
        "src/service.test.ts",
        "src/service_test.ts",
        "src/service.spec.tsx",
        "src/service_spec.mjs",
        "tests/service.ts",
        "src/__tests__/service.ts",
        "test/service.ts",
        "e2e/checkout.ts",
        "src/fixtures/users.ts",
        "src/__fixtures__/users.ts",
        "src/__mocks__/database.ts",
        "src/checkout.e2e.ts",
        "src/sort.bench.ts",
        "src/test-utils.tsx",
        "vitest.config.ts",
        "playwright.config.mts",
        "src/globals.d.ts",
      ].map((filename) => ({
        code: 'import { vi } from "vitest";\nimport { DATABASE } from "./__mocks__/database";',
        filename,
      })),
    ],
  },
);
