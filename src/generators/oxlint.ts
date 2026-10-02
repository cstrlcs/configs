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
  ].map((method) => [method, `Bun 1.4 does not implement vi.${method}().`]),
);

const RELATIVE_IMPORT_PATTERNS = [
  { group: ["./**"], message: "Use a path alias instead of a relative import." },
];

const DISABLED = new Set([
  "eslint/capitalized-comments",
  "eslint/require-unicode-regexp",
  "typescript/consistent-return",
  "typescript/explicit-function-return-type",
  "typescript/explicit-module-boundary-types",
  "import/group-exports",
  "import/exports-last",
  "eslint/require-await",
  "typescript/require-await",
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
  "unicorn/no-nested-ternary",
  "eslint/id-length",
  "eslint/no-undef",
  "eslint/prefer-object-spread",
  "unicorn/prefer-ternary",
  "eslint/one-var",
  "eslint/no-underscore-dangle",
  "typescript/prefer-namespace-keyword",
  "typescript/prefer-readonly-parameter-types",
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
  "react/forbid-component-props",
  "react/jsx-no-literals",
  "react/jsx-props-no-spreading",
  "react/no-set-state",
  "react/react-in-jsx-scope",
  "vue/require-default-prop",
  "eslint/no-eq-null",
  "typescript/unbound-method",
  "eslint/init-declarations",
]);

const OVERRIDES: Record<string, RuleConfiguration> = {
  "eslint/complexity": ["error", 8],
  "eslint/eqeqeq": ["error", "always", { null: "ignore" }],
  "eslint/no-void": ["error", { allowAsStatement: true }],
  "eslint/no-console": ["error", { allow: ["error", "warn"] }],
  "eslint/func-style": ["error", "declaration"],
  "eslint/id-denylist": ["error", "foo", "bar", "baz", "thing", "stuff", "tmp", "doSomething"],
  "eslint/max-depth": ["error", 3],
  "eslint/max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
  "eslint/max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
  "eslint/max-nested-callbacks": ["error", 3],
  "eslint/max-params": ["error", 3],
  "eslint/max-statements": ["error", 25],
  "eslint/no-restricted-imports": ["error", { patterns: RELATIVE_IMPORT_PATTERNS }],
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
  "import/max-dependencies": ["error", { ignoreTypeImports: false, max: 11 }],
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
  "typescript/no-base-to-string": ["error", { checkUnknown: true, ignoredTypeNames: [] }],
  "typescript/no-floating-promises": [
    "error",
    {
      allowForKnownSafeCalls: [],
      allowForKnownSafePromises: [],
      checkThenables: true,
      ignoreIIFE: false,
      ignoreVoid: true,
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
      allowNumber: true,
      allowRegExp: false,
    },
  ],
  "typescript/return-await": ["error", "error-handling-correctness-only"],
  "typescript/strict-boolean-expressions": [
    "error",
    {
      allowAny: false,
      allowNullableBoolean: true,
      allowNullableEnum: false,
      allowNullableNumber: false,
      allowNullableObject: true,
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
  "unicorn/max-nested-calls": ["error", { max: 4 }],
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
  "react/jsx-max-depth": ["error", { max: 4 }],
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

const JSX_FILES = ["**/*.jsx", "**/*.tsx"];

const DECLARATION_FILES = ["**/*.d.ts", "**/*.d.cts", "**/*.d.mts"];

const COMMONJS_CONFIG_FILES = ["**/*.config.js", "**/*.config.cjs", "**/.*rc.js", "**/.*rc.cjs"];

const TEST_SUPPORT_FILES = ["**/tests/**", "**/__tests__/**", "**/test-utils.*"];

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
    files: JSX_FILES,
    rules: {
      "eslint/max-lines-per-function": "off",
      "import/max-dependencies": "off",
      "eslint/complexity": "off",
    },
  },
  {
    files: JAVASCRIPT_FILES,
    rules: { "eslint/no-undef": "error", "jsdoc/require-param-type": "error" },
  },
  {
    files: COMMONJS_CONFIG_FILES,
    env: { commonjs: true, node: true },
    rules: {
      "eslint/no-implicit-globals": "off",
      "eslint/no-undef": "off",
      "import/no-commonjs": "off",
      "import/no-nodejs-modules": "off",
      "import/unambiguous": "off",
      "typescript/no-require-imports": "off",
      "typescript/no-unsafe-argument": "off",
      "typescript/no-unsafe-assignment": "off",
      "typescript/no-unsafe-call": "off",
      "typescript/no-unsafe-member-access": "off",
      "typescript/no-var-requires": "off",
      "unicorn/prefer-module": "off",
    },
  },
  {
    files: TEST_SUPPORT_FILES,
    rules: { "react/only-export-components": "off" },
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
          patterns: RELATIVE_IMPORT_PATTERNS,
        },
      ],
      "import/unambiguous": "off",
    },
  },
];

const PRESET_OVERRIDES: Record<string, ConfigOverride[]> = {};

const PRESET_RULES: Record<string, Record<string, RuleConfiguration>> = {};

const CSTRLCS_PLUGIN = "@cstrlcs/configs/plugins/cstrlcs.js";

const CSTRLCS_RULES: Record<string, RuleConfiguration> = {
  "cstrlcs/no-comments": "error",
  "cstrlcs/no-explicit-return-type": "error",
  "cstrlcs/padding-between-statements": "error",
};

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

function toPlugins(scopes: readonly string[]) {
  return [...new Set(scopes.filter((scope) => VALID_OXLINT_PLUGINS.has(scope)))];
}

function normalizeScope(scope: string) {
  return scope.replaceAll("_", "-");
}

function buildRules(preset: string, scopes: readonly string[]) {
  const presetRules = PRESET_RULES[preset] ?? {};

  return Object.fromEntries(
    rules
      .filter((rule) => scopes.includes(normalizeScope(rule.scope)))
      .map((rule) => {
        const key = `${normalizeScope(rule.scope)}/${rule.value}`;

        return [key, DISABLED.has(key) ? "off" : (presetRules[key] ?? OVERRIDES[key] ?? "error")];
      }),
  );
}

function isTestRule(key: string) {
  return key.startsWith("vitest/");
}

function splitTestRules(allRules: Record<string, RuleConfiguration>) {
  const entries = Object.entries(allRules);

  return {
    baseRules: Object.fromEntries(
      entries.map(([key, value]) => [key, isTestRule(key) ? "off" : value]),
    ),
    testRules: Object.fromEntries(entries.filter(([key]) => isTestRule(key))),
  };
}

function buildOverrides(preset: string, testRules: Record<string, RuleConfiguration>) {
  return [
    ...GLOBAL_OVERRIDES,
    { files: TEST_FILES, rules: testRules },
    ...(PRESET_OVERRIDES[preset] ?? []),
  ];
}

await $`mkdir -p oxlint`;

await Promise.all(
  Object.entries(PRESETS).map(async ([preset, scopes]: readonly [string, readonly string[]]) => {
    const { baseRules, testRules } = splitTestRules(buildRules(preset, scopes));

    const config = {
      options: {
        denyWarnings: true,
        reportUnusedDisableDirectives: "error",
        typeAware: true,
        typeCheck: true,
      },
      plugins: toPlugins(scopes),
      jsPlugins: [CSTRLCS_PLUGIN],
      rules: { ...baseRules, ...CSTRLCS_RULES },
      overrides: buildOverrides(preset, testRules),
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
  }),
);

await $`bun run lint:fix`;
