import { $, build, Glob } from "bun";

import { writeFormatted } from "./write-preset.ts";

const entrypoints = await Array.fromAsync(new Glob("src/plugins/*/index.ts").scan());

await $`rm -rf plugins`;

await Promise.all(
  entrypoints.map(async (entrypoint) => {
    const name = entrypoint.split("/").at(-2) ?? "index";

    const result = await build({
      entrypoints: [entrypoint],
      external: ["oxc-resolver"],
      naming: `${name}.js`,
      outdir: "plugins",
      target: "node",
    });

    if (!result.success) {
      throw new AggregateError(result.logs, `Failed to build plugin "${name}".`);
    }

    await Promise.all(
      result.outputs.map(async (output) => {
        await writeFormatted(output.path, await output.text());
      }),
    );
  }),
);
