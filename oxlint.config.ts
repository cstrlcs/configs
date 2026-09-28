import { defineConfig } from "oxlint";

import config from "./oxlint/base.js";

export default defineConfig({
  ...config,
  ignorePatterns: [...(config.ignorePatterns ?? []), "plugins/**"],
  jsPlugins: ["./src/plugins/cstrlcs/index.ts"],
  overrides: [
    ...(config.overrides ?? []),
    {
      files: ["oxlint/*.js", "oxlint/*.d.ts", "oxfmt/*.js", "oxfmt/*.d.ts"],
      rules: {
        "eslint/max-lines": "off",
      },
    },
    {
      files: ["src/plugins/**/*.test.ts"],
      rules: {
        "import/no-nodejs-modules": "off",
        "vitest/no-import-node-test": "off",
        "vitest/require-hook": "off",
      },
    },
  ],
});
