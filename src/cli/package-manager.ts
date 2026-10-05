import { readJson } from "./files.ts";
import { objectField, stringField } from "./json.ts";
import { run } from "./terminal.ts";

const DIRECT_DEPENDENCIES = ["@cstrlcs/configs", "@types/bun"];

export const CONFIGS_DIR = "node_modules/@cstrlcs/configs";
export const REQUIRED_DEPENDENCIES = [...DIRECT_DEPENDENCIES, "oxlint", "oxlint-tsgolint", "oxfmt"];

export async function readPeers(root: string) {
  const configsPackage = await readJson(root, `${CONFIGS_DIR}/package.json`);
  const peers = objectField(configsPackage, "peerDependencies");

  return Object.keys(peers).map((name) => ({ name, version: stringField(peers, name) }));
}

export async function addDependencies(root: string, signal?: AbortSignal) {
  await run(["bun", "add", "-D", "--exact", ...DIRECT_DEPENDENCIES], root, signal);

  const peers = await readPeers(root);

  await run(
    ["bun", "add", "-D", "--exact", ...peers.map(({ name, version }) => `${name}@${version}`)],
    root,
    signal,
  );
}
