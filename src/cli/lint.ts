import path from "node:path";
import { ResolverFactory } from "oxc-resolver";

import { doctor } from "./doctor.ts";
import { readJson, readText } from "./files.ts";
import { objectField, stringField } from "./json.ts";
import { loadProject } from "./project.ts";
import { exitCodeOf } from "./terminal.ts";

const PACKAGES = {
  oxlint: "oxlint",
  oxfmt: "oxfmt",
  knip: "knip",
  sherif: "sherif",
  tsc: "typescript",
} as const;

type Tool = keyof typeof PACKAGES;

interface Step {
  readonly label: string;
  readonly command: readonly [string, ...string[]];
}

const LINT_STEPS: readonly (readonly [Tool, ...string[]])[] = [
  ["oxlint", "--type-aware", "."],
  ["oxfmt", "--check"],
  ["knip"],
];

const FIX_STEPS: readonly (readonly [Tool, ...string[]])[] = [
  ["oxlint", "--type-aware", "--fix"],
  ["oxfmt"],
  ["knip"],
];

const resolver = new ResolverFactory({ exportsFields: [] });

async function binPath(root: string, tool: Tool) {
  const name = PACKAGES[tool];
  const { path: manifest } = resolver.sync(root, `${name}/package.json`);

  if (manifest === undefined) {
    throw new Error(`${name} is not installed. Run 'bunx @cstrlcs/configs install' to add it.`);
  }

  const dir = path.dirname(manifest);
  const packageJson = await readJson(dir, "package.json");

  return path.join(dir, stringField(objectField(packageJson, "bin"), tool));
}

export async function lint(root: string, fix: boolean, signal?: AbortSignal) {
  await doctor(root);

  const { dirs, packageJson, workspacePatterns } = await loadProject(root);
  const toolSteps = [...(fix ? FIX_STEPS : LINT_STEPS)];

  if (workspacePatterns.length > 0) {
    toolSteps.push(["sherif"]);
  }

  const steps: Step[] = await Promise.all(
    toolSteps.map(async ([tool, ...args]) => ({
      label: tool,
      command: ["node", await binPath(root, tool), ...args],
    })),
  );

  const tsc = await binPath(root, "tsc");

  const tsconfigs = await Promise.all(
    dirs.map(async (dir) => readText(root, `${dir}/tsconfig.json`)),
  );

  steps.push(
    ...dirs
      .filter((_, index) => tsconfigs[index] !== null)
      .map((dir) => ({
        label: dir === "." ? "tsc" : `tsc ${dir}`,
        command: ["node", tsc, "--noEmit", "-p", dir] as const,
      })),
  );

  if (stringField(objectField(packageJson, "scripts"), "test") !== "") {
    steps.push({ label: "test", command: ["bun", "run", "test"] });
  }

  const exitCodes = await Array.fromAsync(steps, async ({ command }) =>
    exitCodeOf(command, root, { signal }),
  );

  const failed = steps.filter((_, index) => exitCodes[index] !== 0).map(({ label }) => label);

  if (failed.length > 0) {
    throw new Error(`${failed.join(", ")} failed`);
  }
}
