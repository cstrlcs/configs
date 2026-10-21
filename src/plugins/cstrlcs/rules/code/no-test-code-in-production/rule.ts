import type { Context, Ranged } from "@oxlint/plugins";
import path from "node:path";
import { defineRule } from "@oxlint/plugins";
import { ResolverFactory } from "oxc-resolver";

import { staticString } from "../shared/constants.ts";
import { isTestOrConfigFile } from "../shared/files.ts";

const TEST_PACKAGE =
  /^(?:(?:vitest|msw|playwright|fast-check|testcontainers|@playwright\/test)(?:\/|$)|@(?:vitest|testing-library|fast-check|testcontainers)\/|bun:test$)/v;

const TEST_SUPPORT_DIRECTORY =
  /(?:^|\/)(?:tests|__tests__|test|e2e|fixtures|__fixtures__|__mocks__)\//v;

const TEST_SUPPORT_FILE = /\.(?:e2e|bench)\.|^test-utils\.|\.d\.[cm]?ts$/v;
const TEST_MODULE_DIRECTORY = /(?:^|\/)(?:tests|__tests__|fixtures|__fixtures__|__mocks__)\//v;
const TEST_MODULE_FILE = /[._](?:test|spec)(?:\.|$)|^test-utils(?:\.|$)/v;
const RELATIVE = /^\.\.?(?:\/|$)/v;
const NODE_MODULES = /(?:^|\/)node_modules\//v;

const resolver = new ResolverFactory({
  conditionNames: ["node", "import"],
  extensionAlias: {
    ".cjs": [".cts", ".cjs"],
    ".js": [".ts", ".tsx", ".js", ".jsx"],
    ".mjs": [".mts", ".mjs"],
  },
  extensions: [".ts", ".tsx", ".d.ts", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  symlinks: false,
  tsconfig: "auto",
});

function relativePath(context: Context, filePath: string) {
  return path.relative(context.cwd, filePath).replaceAll("\\", "/");
}

function resolveTarget(importer: string, specifier: string) {
  const resolved = resolver.resolveFileSync(importer, specifier).path;

  if (resolved !== undefined || !RELATIVE.test(specifier)) {
    return resolved;
  }

  return path.resolve(path.dirname(importer), specifier);
}

function isTestModule(context: Context, specifier: string) {
  const target = resolveTarget(context.filename, specifier);

  if (target === undefined) {
    return false;
  }

  const relative = relativePath(context, target);

  if (NODE_MODULES.test(relative)) {
    return false;
  }

  return TEST_MODULE_DIRECTORY.test(relative) || TEST_MODULE_FILE.test(path.basename(target));
}

function check(context: Context, node: Ranged, source: string | undefined) {
  if (source === undefined) {
    return;
  }

  if (TEST_PACKAGE.test(source)) {
    context.report({ data: { source }, messageId: "testPackage", node });

    return;
  }

  if (isTestModule(context, source)) {
    context.report({ data: { source }, messageId: "testModule", node });
  }
}

export const noTestCodeInProduction = defineRule({
  meta: {
    docs: {
      description:
        "Forbid production code from importing test frameworks, test files and fixtures.",
    },
    messages: {
      testModule:
        '"{{source}}" is test code. Move what production needs out of the test, fixture or mock files.',
      testPackage: '"{{source}}" is a test-only package. Keep it out of production code.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    return {
      before() {
        return (
          !isTestOrConfigFile(context.filename) &&
          !TEST_SUPPORT_FILE.test(path.basename(context.filename)) &&
          !TEST_SUPPORT_DIRECTORY.test(relativePath(context, context.filename))
        );
      },
      ExportAllDeclaration(node) {
        check(context, node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null) {
          check(context, node.source, node.source.value);
        }
      },
      ImportDeclaration(node) {
        check(context, node.source, node.source.value);
      },
      ImportExpression({ source }) {
        check(context, source, staticString(source));
      },
      TSImportType({ source }) {
        check(context, source, source.value);
      },
    };
  },
});
