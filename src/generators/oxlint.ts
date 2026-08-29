import { $, write } from "bun";
import { z } from "zod";

const RuleSchema = z.object({
  scope: z.string(),
  value: z.string(),
  category: z.string(),
  type_aware: z.boolean(),
  fix: z.string(),
  default: z.boolean(),
  docs_url: z.string(),
});

const DISABLED: string[] = [
  "eslint/sort-keys",
  "unicorn/prefer-set-has",
  "eslint/no-magic-numbers",
  "unicorn/no-null",
  "import/prefer-default-export",
  "oxc/no-async-await",
  "eslint/no-ternary",
  "typescript/non-nullable-type-assertion-style",
  "eslint/arrow-body-style",
  "import/no-named-export",
  "import/namespace",
  "eslint/vars-on-top",
  "oxc/no-rest-spread-properties",
  "eslint/no-undefined",
  "jsdoc/require-param-type",
  "typescript/return-await",
  "eslint/sort-imports",
  "oxc/no-optional-chaining",
  "eslint/max-lines-per-function",
  "typescript/explicit-function-return-type",
  "typescript/explicit-module-boundary-types",
  "eslint/no-duplicate-imports",
  "eslint/max-statements",
  "eslint/no-nested-ternary",
  "unicorn/no-nested-ternary",
  "eslint/max-lines",
  "eslint/id-length",
  "eslint/no-undef",
  "unicorn/prefer-ternary",
  "eslint/max-params",
  "eslint/no-warning-comments",
  "eslint/one-var",
  "eslint/no-underscore-dangle",
  "eslint/require-unicode-regexp",
  "vitest/no-hooks",
  "vitest/prefer-called-exactly-once-with",
  "react/rule-suppression",
  "react/todo",
  "react/no-set-state",
  "vue/require-default-prop",

  // Temporarily disabled rules that require manual review
  "eslint/no-use-before-define",
  "typescript/no-explicit-any",
  "eslint/no-console",
  "eslint/no-plusplus",
  "eslint/no-continue",
  "typescript/no-non-null-assertion",
  "eslint/require-await",
  "eslint/no-shadow",
  "unicorn/prefer-module",
  "typescript/no-var-requires",
  "typescript/no-require-imports",
  "typescript/prefer-readonly-parameter-types",
];

const OVERRIDES: Record<string, (string | Record<string, unknown>)[]> = {
  "eslint/func-style": ["error", "declaration"],
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
  "typescript/parameter-properties": ["error", { prefer: "parameter-property" }],
};

const PRESET_OVERRIDES: Record<string, { files: string[]; rules: Record<string, string> }[]> = {
  vue: [{ files: ["**/*.vue"], rules: { "import/no-default-export": "off" } }],
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
  svelte: [...BASE_PLUGINS, "svelte"],
};

const output = await $`bunx oxlint --rules -f json`.text();
const rules = z.array(RuleSchema).parse(JSON.parse(output));

function normalizeScope(scope: string): string {
  return scope.replaceAll("_", "-");
}

function buildRules(
  scopes: readonly string[],
): Record<string, string | (string | Record<string, unknown>)[]> {
  return Object.fromEntries(
    rules
      .filter((rule) => scopes.includes(normalizeScope(rule.scope)))
      .filter((rule) => !DISABLED.includes(`${normalizeScope(rule.scope)}/${rule.value}`))
      .map((rule) => {
        const key = `${normalizeScope(rule.scope)}/${rule.value}`;
        return [key, OVERRIDES[key] ?? "error"];
      }),
  );
}

await $`mkdir -p oxlint`;

await Promise.all(
  Object.entries(PRESETS).map(async ([preset, scopes]: readonly [string, readonly string[]]) => {
    const overrides = PRESET_OVERRIDES[preset];
    const config = {
      rules: buildRules(scopes),
      ...(overrides ? { overrides } : {}),
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
