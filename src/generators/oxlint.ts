import { $, write } from "bun";
import { z } from "zod";

type RuleOption = boolean | number | string | Record<string, unknown>;
type RuleConfiguration = string | [string, ...RuleOption[]];
interface ConfigOverride {
  files: string[];
  env?: Record<string, boolean>;
  rules?: Record<string, RuleConfiguration>;
}

const RuleSchema = z.object({
  scope: z.string(),
  value: z.string(),
  category: z.string(),
  type_aware: z.boolean(),
  fix: z.string(),
  default: z.boolean(),
  docs_url: z.string(),
});

const BUN_VI_METHOD_RESTRICTIONS = Object.fromEntries(
  [
    "advanceTimersByTimeAsync",
    "advanceTimersToNextFrame",
    "advanceTimersToNextTimerAsync",
    "defineHelper",
    "doMock",
    "doUnmock",
    "dynamicImportSettled",
    "getMockedSystemTime",
    "getRealSystemTime",
    "hoisted",
    "importActual",
    "importMock",
    "isMockFunction",
    "mocked",
    "mockObject",
    "resetConfig",
    "resetModules",
    "runAllTicks",
    "runAllTimersAsync",
    "runOnlyPendingTimersAsync",
    "setConfig",
    "setSystemTime",
    "setTimerTickMode",
    "stubEnv",
    "stubGlobal",
    "unmock",
    "unstubAllEnvs",
    "unstubAllGlobals",
    "waitFor",
    "waitUntil",
  ].map((method): [string, string] => [method, `Bun 1.4 does not implement vi.${method}().`]),
);

const DISABLED = new Set([
  "eslint/no-magic-numbers",
  "eslint/sort-keys",
  "import/no-default-export",
  "unicorn/no-null",
  "import/prefer-default-export",
  "oxc/no-async-await",
  "eslint/no-ternary",
  "typescript/non-nullable-type-assertion-style",
  "eslint/arrow-body-style",
  "import/no-named-export",
  "eslint/vars-on-top",
  "oxc/no-rest-spread-properties",
  "eslint/no-undefined",
  "jsdoc/require-param-type",
  "eslint/sort-imports",
  "oxc/no-optional-chaining",
  "eslint/no-duplicate-imports",
  "eslint/no-nested-ternary",
  "eslint/id-length",
  "eslint/no-undef",
  "eslint/prefer-object-spread",
  "unicorn/prefer-ternary",
  "eslint/one-var",
  "eslint/no-underscore-dangle",
  "typescript/prefer-namespace-keyword",
  "typescript/prefer-reduce-type-parameter",
  "typescript/promise-function-async",
  "vitest/prefer-called-exactly-once-with",
  "vitest/prefer-import-in-mock",
  "vitest/prefer-importing-vitest-globals",
  "vitest/prefer-expect-resolves",
  "vitest/require-awaited-expect-poll",
  "vitest/require-local-test-context-for-concurrent-snapshots",
  "vitest/no-hooks",
  "vitest/prefer-called-once",
  "vitest/prefer-to-be-falsy",
  "vitest/prefer-to-be-truthy",
  "vitest/prefer-todo",
  "react/jsx-no-constructed-context-values",
  "react/no-set-state",
  "react/react-in-jsx-scope",
  "vue/require-default-prop",
]);

const OVERRIDES: Record<string, RuleConfiguration> = {
  "eslint/complexity": ["error", 8],
  "eslint/func-style": ["error", "declaration"],
  "eslint/id-denylist": ["error", "foo", "bar", "baz", "thing", "stuff", "tmp", "doSomething"],
  "eslint/max-depth": ["error", 3],
  "eslint/max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
  "eslint/max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
  "eslint/max-nested-callbacks": ["error", 3],
  "eslint/max-params": ["error", 3],
  "eslint/max-statements": ["error", 20],
  "eslint/no-restricted-exports": [
    "error",
    { restrictedNamedExports: ["data", "result", "value", "helper", "manager"] },
  ],
  "eslint/prefer-destructuring": [
    "error",
    {
      AssignmentExpression: { array: false, object: true },
      VariableDeclarator: { array: false, object: true },
    },
  ],
  "eslint/no-shadow": ["error", { hoist: "functions" }],
  "eslint/no-warning-comments": [
    "error",
    {
      decoration: [],
      location: "anywhere",
      terms: ["todo", "fixme", "xxx", "hack", "wip"],
    },
  ],
  "eslint/require-unicode-regexp": ["error", { requireFlag: "v" }],
  "import/max-dependencies": ["error", { ignoreTypeImports: false, max: 8 }],
  "import/no-commonjs": ["error", { allowConditionalRequire: false }],
  "import/no-cycle": ["error", { ignoreTypes: false }],
  "oxc/no-barrel-file": ["error", { threshold: 0 }],
  "oxc/no-map-spread": ["error", { ignoreArgs: false, ignoreRereads: false }],
  "promise/prefer-await-to-then": ["error", { strict: true }],
  "typescript/ban-ts-comment": [
    "error",
    {
      minimumDescriptionLength: 10,
      "ts-check": false,
      "ts-expect-error": "allow-with-description",
      "ts-ignore": true,
      "ts-nocheck": true,
    },
  ],
  "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
  "typescript/explicit-function-return-type": [
    "error",
    {
      allowConciseArrowFunctionExpressionsStartingWithVoid: false,
      allowDirectConstAssertionInArrowFunctions: false,
      allowExpressions: false,
      allowFunctionsWithoutTypeParameters: false,
      allowHigherOrderFunctions: false,
      allowIIFEs: false,
      allowTypedFunctionExpressions: false,
      allowedNames: [],
    },
  ],
  "typescript/explicit-module-boundary-types": [
    "error",
    {
      allowArgumentsExplicitlyTypedAsAny: false,
      allowDirectConstAssertionInArrowFunctions: false,
      allowHigherOrderFunctions: false,
      allowOverloadFunctions: false,
      allowTypedFunctionExpressions: false,
      allowedNames: [],
    },
  ],
  "typescript/no-base-to-string": ["error", { checkUnknown: true, ignoredTypeNames: [] }],
  "typescript/no-floating-promises": [
    "error",
    {
      allowForKnownSafeCalls: [],
      allowForKnownSafePromises: [],
      checkThenables: true,
      ignoreIIFE: false,
      ignoreVoid: false,
    },
  ],
  "typescript/only-throw-error": [
    "error",
    {
      allow: [],
      allowRethrowing: false,
      allowThrowingAny: false,
      allowThrowingUnknown: false,
    },
  ],
  "vitest/no-restricted-vi-methods": ["error", BUN_VI_METHOD_RESTRICTIONS],
  "unicorn/filename-case": [
    "error",
    {
      cases: {
        camelCase: true,
        pascalCase: true,
        kebabCase: true,
      },
    },
  ],
  "typescript/restrict-plus-operands": [
    "error",
    {
      allowAny: false,
      allowBoolean: false,
      allowNullish: false,
      allowNumberAndString: false,
      allowRegExp: false,
      skipCompoundAssignments: false,
    },
  ],
  "typescript/restrict-template-expressions": [
    "error",
    {
      allow: [],
      allowAny: false,
      allowArray: false,
      allowBoolean: false,
      allowNever: false,
      allowNullish: false,
      allowNumber: false,
      allowRegExp: false,
    },
  ],
  "typescript/return-await": ["error", "error-handling-correctness-only"],
  "typescript/strict-boolean-expressions": [
    "error",
    {
      allowAny: false,
      allowNullableBoolean: false,
      allowNullableEnum: false,
      allowNullableNumber: false,
      allowNullableObject: false,
      allowNullableString: false,
      allowNumber: false,
      allowString: false,
    },
  ],
  "typescript/switch-exhaustiveness-check": [
    "error",
    {
      allowDefaultCaseForExhaustiveSwitch: false,
      considerDefaultExhaustiveForUnions: false,
      requireDefaultForNonUnion: true,
    },
  ],
  "unicorn/no-array-reduce": ["error", { allowSimpleOperations: false }],
  "unicorn/no-array-reverse": ["error", { allowExpressionStatement: false }],
  "unicorn/no-array-sort": ["error", { allowAfterSpread: false, allowExpressionStatement: false }],
  "typescript/parameter-properties": ["error", { prefer: "parameter-property" }],
  "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
  "import/no-namespace": ["error", { ignore: ["@stylexjs/stylex"] }],
  "vitest/consistent-each-for": ["error", { describe: "each", it: "each", test: "each" }],
  "vitest/consistent-test-it": ["error", { fn: "test", withinDescribe: "test" }],
  "vitest/max-expects": ["error", { max: 5 }],
  "vitest/max-nested-describe": ["error", { max: 3 }],
  "vitest/no-large-snapshots": [
    "error",
    {
      allowedSnapshots: {},
      inlineMaxSize: 10,
      maxSize: 25,
    },
  ],
  "vitest/prefer-snapshot-hint": ["error", "always"],
  "vitest/require-top-level-describe": ["error", { maxNumberOfTopLevelDescribes: 1 }],
  "react/jsx-filename-extension": [
    "error",
    { allow: "as-needed", extensions: ["jsx", "tsx"], ignoreFilesWithoutCode: false },
  ],
  "react/only-export-components": [
    "error",
    { allowConstantExport: false, allowExportNames: [], checkJS: true, customHOCs: [] },
  ],
};

const JAVASCRIPT_FILES = ["**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"];

const TYPESCRIPT_FILES = ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts"];

const DECLARATION_FILES = ["**/*.d.ts", "**/*.d.cts", "**/*.d.mts"];

const TEST_FILES = [
  "**/*.test.js",
  "**/*.test.jsx",
  "**/*.test.cjs",
  "**/*.test.mjs",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.test.cts",
  "**/*.test.mts",
  "**/*_test.js",
  "**/*_test.jsx",
  "**/*_test.cjs",
  "**/*_test.mjs",
  "**/*_test.ts",
  "**/*_test.tsx",
  "**/*_test.cts",
  "**/*_test.mts",
  "**/*.spec.js",
  "**/*.spec.jsx",
  "**/*.spec.cjs",
  "**/*.spec.mjs",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/*.spec.cts",
  "**/*.spec.mts",
  "**/*_spec.js",
  "**/*_spec.jsx",
  "**/*_spec.cjs",
  "**/*_spec.mjs",
  "**/*_spec.ts",
  "**/*_spec.tsx",
  "**/*_spec.cts",
  "**/*_spec.mts",
];

const GLOBAL_OVERRIDES: ConfigOverride[] = [
  {
    files: ["*.config.ts"],
    rules: { "import/no-nodejs-modules": "off" },
  },
  {
    files: TYPESCRIPT_FILES,
    rules: { "eslint/default-case": "off" },
  },
  {
    files: DECLARATION_FILES,
    rules: { "unicorn/require-module-specifiers": "off" },
  },
  {
    files: JAVASCRIPT_FILES,
    rules: { "eslint/no-undef": "error", "jsdoc/require-param-type": "error" },
  },
  {
    files: TEST_FILES,
    env: { vitest: true },
    rules: {
      "eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              message: "Use Bun test globals so Oxlint can apply the complete Vitest ruleset.",
              name: "bun:test",
            },
          ],
        },
      ],
      "import/unambiguous": "off",
    },
  },
];

const PRESET_OVERRIDES: Record<string, ConfigOverride[]> = {};

const BASE_PLUGINS = [
  "eslint",
  "typescript",
  "unicorn",
  "oxc",
  "import",
  "jsdoc",
  "promise",
  "vitest",
];

const PRESETS: Record<string, string[]> = {
  base: [...BASE_PLUGINS],
  react: [...BASE_PLUGINS, "react", "react-hooks", "jsx-a11y"],
  vue: [...BASE_PLUGINS, "vue"],
};

const VALID_OXLINT_PLUGINS = new Set([
  "unicorn",
  "typescript",
  "oxc",
  "import",
  "jsdoc",
  "jest",
  "vitest",
  "jsx-a11y",
  "nextjs",
  "react-perf",
  "promise",
  "node",
  "vue",
  "react",
]);

const output = await $`bunx oxlint --rules -f json`.text();
const rules = z.array(RuleSchema).parse(JSON.parse(output));

function toPlugins(scopes: readonly string[]): string[] {
  return [...new Set(scopes.filter((scope): boolean => VALID_OXLINT_PLUGINS.has(scope)))];
}

function normalizeScope(scope: string): string {
  return scope.replaceAll("_", "-");
}

function buildRules(scopes: readonly string[]): Record<string, RuleConfiguration> {
  return Object.fromEntries(
    rules
      .filter((rule): boolean => scopes.includes(normalizeScope(rule.scope)))
      .map((rule): [string, RuleConfiguration] => {
        const key = `${normalizeScope(rule.scope)}/${rule.value}`;
        return [key, DISABLED.has(key) ? "off" : (OVERRIDES[key] ?? "error")];
      }),
  );
}

await $`mkdir -p oxlint`;

await Promise.all(
  Object.entries(PRESETS).map(
    async ([preset, scopes]: readonly [string, readonly string[]]): Promise<void> => {
      const config = {
        options: {
          denyWarnings: true,
          reportUnusedDisableDirectives: "error",
          typeAware: true,
          typeCheck: true,
        },
        plugins: toPlugins(scopes),
        rules: buildRules(scopes),
        overrides: [...GLOBAL_OVERRIDES, ...(PRESET_OVERRIDES[preset] ?? [])],
      };

      await Promise.all([
        write(
          `oxlint/${preset}.js`,
          `import { defineConfig } from "oxlint";

export default defineConfig(${JSON.stringify(config, null, 2)});
`,
        ),
        write(
          `oxlint/${preset}.d.ts`,
          `import type { OxlintConfig } from "oxlint";

declare const config: OxlintConfig;
export default config;
`,
        ),
      ]);
    },
  ),
);

await $`bun run lint:fix`;
