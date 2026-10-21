import type { Project } from "./project.ts";

import { readJson } from "./files.ts";
import { objectField, stringField } from "./json.ts";
import { projectDependencies } from "./project.ts";
import { run } from "./terminal.ts";

const DIRECT_DEPENDENCIES = ["@cstrlcs/configs", "@types/bun", "bun-types"];

export const FRAMEWORK_PEERS = new Map([["@astrojs/compiler-rs", "astro"]]);
export const CONFIGS_DIR = "node_modules/@cstrlcs/configs";

export const REQUIRED_DEPENDENCIES = [
  ...DIRECT_DEPENDENCIES,
  "oxlint",
  "oxlint-tsgolint",
  "oxfmt",
  "typescript",
  "knip",
  "sherif",
];

export async function readPeers(project: Project) {
  const configsPackage = await readJson(project.root, `${CONFIGS_DIR}/package.json`);
  const peers = objectField(configsPackage, "peerDependencies");
  const used = await projectDependencies(project);

  return Object.keys(peers)
    .filter((name) => {
      const framework = FRAMEWORK_PEERS.get(name);

      return framework === undefined || used.has(framework);
    })
    .map((name) => ({ name, version: stringField(peers, name) }));
}

export async function addDependencies(project: Project, signal?: AbortSignal) {
  await run(["bun", "add", "-D", "--exact", ...DIRECT_DEPENDENCIES], project.root, { signal });

  const peers = await readPeers(project);

  await run(
    ["bun", "add", "-D", "--exact", ...peers.map(({ name, version }) => `${name}@${version}`)],
    project.root,
    { signal },
  );
}
