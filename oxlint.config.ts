import { defineConfig } from "oxlint";

import config from "./oxlint/base.js";

export default defineConfig({
  ...config,
  overrides: [
    ...(config.overrides ?? []),
    {
      files: ["oxlint/*.js", "oxlint/*.d.ts", "oxfmt/*.js", "oxfmt/*.d.ts"],
      rules: { "import/no-default-export": "off" },
    },
  ],
});
