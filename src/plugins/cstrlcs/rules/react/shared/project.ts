import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";

const MAJOR_VERSION = /^\d+/v;
const resolver = new ResolverFactory({ conditionNames: ["node", "import"] });
const majorVersions = new Map<string, number | undefined>();

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

function installedMajor(directory: string) {
  const root = findPackageRoot(directory);
  const manifest = root === undefined ? undefined : resolver.sync(root, "react/package.json").path;
  const major = manifest === undefined ? undefined : MAJOR_VERSION.exec(readVersion(manifest))?.[0];

  return major === undefined ? undefined : Number(major);
}

export function reactMajorVersion(filename: string) {
  const directory = path.dirname(filename);

  if (!majorVersions.has(directory)) {
    majorVersions.set(directory, installedMajor(directory));
  }

  return majorVersions.get(directory);
}
