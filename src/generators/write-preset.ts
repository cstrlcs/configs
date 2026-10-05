import { $, write } from "bun";
import { format } from "oxfmt";

import config from "./oxfmt-config.ts";

export async function writeFormatted(path: string, source: string) {
  const formatted = await format(path, source, config);

  if (formatted.errors.length > 0) {
    throw new Error(`Failed to format ${path}: ${JSON.stringify(formatted.errors)}`);
  }

  await write(path, formatted.code);
}

export async function writePreset(tool: "oxlint" | "oxfmt", preset: string, presetConfig: unknown) {
  await $`mkdir -p ${tool}`;

  const path = `${tool}/${preset}`;
  const configType = tool === "oxlint" ? "OxlintConfig" : "OxfmtConfig";

  await Promise.all([
    writeFormatted(
      `${path}.js`,
      `import { defineConfig } from "${tool}";

export default defineConfig(${JSON.stringify(presetConfig, null, 2)});
`,
    ),
    writeFormatted(
      `${path}.d.ts`,
      `import type { ${configType} } from "${tool}";

declare const config: ${configType};

export default config;
`,
    ),
  ]);
}
