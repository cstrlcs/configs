import { defineConfig } from "oxlint";

import config from "./oxlint/base.js";

export default defineConfig({
  ...config,
  ignorePatterns: [...(config.ignorePatterns ?? []), "plugins/**"],
  jsPlugins: ["./src/plugins/cstrlcs/index.ts"],
  overrides: [
    ...(config.overrides ?? []),
    {
      files: ["oxlint/*.js", "oxfmt/*.js", "src/generators/oxlint-rules.ts"],
      rules: {
        "eslint/max-lines": "off",
      },
    },
    {
      files: ["src/plugins/**/*.test.ts"],
      rules: {
        "vitest/require-hook": "off",
      },
    },
    {
      files: ["**/*.ts"],
      rules: {
        "eslint/no-restricted-imports": "off",
      },
    },
  ],
});
