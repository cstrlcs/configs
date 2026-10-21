import { defineConfig } from "oxlint";

import config from "./oxlint/base.js";

const RULES = "^src/plugins/cstrlcs/rules";

export default defineConfig({
  ...config,
  ignorePatterns: [...(config.ignorePatterns ?? []), "plugins/**"],
  jsPlugins: ["./src/plugins/cstrlcs/index.ts"],
  rules: {
    ...config.rules,
    "cstrlcs/no-forbidden-dependencies": [
      "error",
      {
        name: "rules-stay-in-their-folder",
        comment: "A rule imports only its own folder and its domain's shared folder.",
        from: { path: `${RULES}/([^/]+)/([^/]+)/`, pathNot: `${RULES}/[^/]+/shared/` },
        to: { path: `${RULES}/`, pathNot: [`${RULES}/$1/$2/`, `${RULES}/$1/shared/`] },
      },
      {
        name: "shared-stays-below-rules",
        comment: "Shared modules never import a rule or another domain.",
        from: {
          path: `${RULES}/([^/]+)/shared/`,
          pathNot: `${RULES}/tailwind/shared/analysis\\.ts$`,
        },
        to: { path: `${RULES}/`, pathNot: `${RULES}/$1/shared/` },
      },
      {
        name: "worker-imports-only-analyses",
        comment: "The Tailwind worker composes each rule's analysis.ts and nothing else.",
        from: { path: `${RULES}/tailwind/shared/analysis\\.ts$` },
        to: {
          path: `${RULES}/`,
          pathNot: [`${RULES}/tailwind/shared/`, `${RULES}/tailwind/[^/]+/analysis\\.ts$`],
        },
      },
    ],
  },
  overrides: [
    ...(config.overrides ?? []),
    {
      files: ["oxlint/*.js", "oxfmt/*.js", "src/generators/oxlint.ts"],
      rules: {
        "eslint/max-lines": "off",
      },
    },
    {
      files: ["src/plugins/cstrlcs/index.ts"],
      rules: {
        "import/max-dependencies": "off",
        "import/no-default-export": "off",
      },
    },
    {
      files: ["src/plugins/**/*.test.ts"],
      rules: {
        "vitest/require-hook": "off",
      },
    },
  ],
});
