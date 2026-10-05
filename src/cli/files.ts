import { Glob } from "bun";

import { parseJsonObject } from "./json.ts";

export function stripDotSlash(path: string) {
  return path.replace(/^(?:\.\/)+/u, "");
}

export async function scanGlob(pattern: string, options: Bun.GlobScanOptions) {
  try {
    return await Array.fromAsync(new Glob(pattern).scan(options));
  } catch (error) {
    throw new Error(`Could not scan ${pattern}`, { cause: error });
  }
}

export function readText(root: string, relative: string) {
  return Bun.file(`${root}/${relative}`)
    .text()
    .catch(() => null);
}

export async function readJson(root: string, relative: string) {
  return parseJsonObject((await readText(root, relative)) ?? "");
}

export async function isDirectory(path: string) {
  try {
    const stats = await Bun.file(path).stat();

    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function writeFiles(root: string, files: Readonly<Record<string, string>>) {
  await Promise.all(
    Object.entries(files).map(([relative, content]) => Bun.write(`${root}/${relative}`, content)),
  );
}
