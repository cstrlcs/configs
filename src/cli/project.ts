import type { JsonObject } from "./json.ts";
import { Glob } from "bun";

import { readText, scanGlob, stripDotSlash } from "./files.ts";
import { EMPTY_OBJECT, decodeJsonObject, isJsonObject } from "./json.ts";

export interface Project {
  readonly root: string;
  readonly packageJson: JsonObject;
  readonly workspacePatterns: readonly string[];
  readonly dirs: readonly string[];
}

function readWorkspacePatterns(packageJson: JsonObject) {
  const { workspaces } = packageJson;
  const patterns = isJsonObject(workspaces) ? workspaces["packages"] : workspaces;

  return Array.isArray(patterns)
    ? patterns.filter((pattern): pattern is string => typeof pattern === "string")
    : [];
}

export async function packageDirs(root: string, pattern: string) {
  const manifests = await scanGlob(`${stripDotSlash(pattern)}/package.json`, {
    cwd: root,
    dot: true,
  });

  return manifests.map((manifest) => stripDotSlash(manifest.slice(0, -"/package.json".length)));
}

async function workspaceDirs(root: string, patterns: readonly string[]) {
  const excluded = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => new Glob(stripDotSlash(pattern.slice(1))));

  const matches = await Promise.all(
    patterns
      .filter((pattern) => !pattern.startsWith("!"))
      .map((pattern) => packageDirs(root, pattern)),
  );

  return [...new Set(matches.flat())].filter(
    (dir) => !excluded.some((glob) => glob.match(dir) || glob.match(`${dir}/package.json`)),
  );
}

async function readPackageJson(root: string) {
  const text = await readText(root, "package.json");

  if (text === null) {
    return EMPTY_OBJECT;
  }

  const packageJson = decodeJsonObject(text);

  if (packageJson === null) {
    throw new Error("package.json is not a valid JSON object. Fix it and run the command again.");
  }

  return packageJson;
}

export async function loadProject(root: string) {
  const packageJson = await readPackageJson(root);
  const workspacePatterns = readWorkspacePatterns(packageJson);
  const workspaces = await workspaceDirs(root, workspacePatterns);

  return {
    root,
    packageJson,
    workspacePatterns,
    dirs: [".", ...workspaces],
  } satisfies Project;
}
