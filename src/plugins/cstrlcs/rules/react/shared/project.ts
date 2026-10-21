import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";

const VERSION = /^(?<major>\d+)(?:\.(?<minor>\d+))?/v;
const resolver = new ResolverFactory({ conditionNames: ["node", "import"] });
const versions = new Map<string, { major: number; minor: number } | undefined>();

function findPackageRoot(directory: string) {
  for (let current = directory; ; current = path.dirname(current)) {
    if (existsSync(path.join(current, "package.json"))) {
      return current;
    }

    if (path.dirname(current) === current) {
      return;
    }
  }
}

function readVersion(manifest: string) {
  const parsed: unknown = JSON.parse(readFileSync(manifest, "utf8"));

  return typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    typeof parsed.version === "string"
    ? parsed.version
    : "";
}

function installedVersion(directory: string, name: string) {
  const root = findPackageRoot(directory);

  if (root === undefined) {
    return;
  }

  const manifest = resolver.sync(root, `${name}/package.json`).path;
  const groups = manifest === undefined ? undefined : VERSION.exec(readVersion(manifest))?.groups;

  if (groups?.["major"] === undefined) {
    return;
  }

  return { major: Number(groups["major"]), minor: Number(groups["minor"] ?? 0) };
}

export function packageVersion(filename: string, name: string) {
  const directory = path.dirname(filename);
  const key = `${directory}\0${name}`;

  if (!versions.has(key)) {
    versions.set(key, installedVersion(directory, name));
  }

  return versions.get(key);
}

export function reactMajorVersion(filename: string) {
  return packageVersion(filename, "react")?.major;
}
