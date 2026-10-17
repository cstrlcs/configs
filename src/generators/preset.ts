import { $, write } from "bun";

export async function writePreset(tool: "oxlint" | "oxfmt", preset: string, presetConfig: unknown) {
  await $`mkdir -p ${tool}`;

  const path = `${tool}/${preset}`;
  const configType = tool === "oxlint" ? "OxlintConfig" : "OxfmtConfig";

  await Promise.all([
    write(
      `${path}.js`,
      `import { defineConfig } from "${tool}";

export default defineConfig(${JSON.stringify(presetConfig, null, 2)});
`,
    ),
    write(
      `${path}.d.ts`,
      `import type { ${configType} } from "${tool}";

declare const config: ${configType};

export default config;
`,
    ),
  ]);
}
