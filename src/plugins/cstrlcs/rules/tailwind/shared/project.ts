import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ResolverFactory } from "oxc-resolver";

export interface Project {
  base: string;
  css: string;
  tailwind: string;
}

export const DEFAULT_CSS = '@import "tailwindcss";';

const TAILWIND_IMPORT = /@import\s+["']tailwindcss["']/v;
const SUPPORTED_VERSION = /^4\.(?:[2-9]|\d{2,})\./v;
const resolver = new ResolverFactory({ conditionNames: ["node", "import"] });
const packageRoots = new Map<string, string | undefined>();
const projects = new Map<string, Project | undefined>();

function findPackageRoot(directory: string) {
  let current = directory;

  while (!existsSync(path.join(current, "package.json"))) {
    const parent = path.dirname(current);

    if (parent === current) {
      return;
    }

    current = parent;
  }

  return current;
}

function shouldSearch(directory: string, name: string) {
  return (
    name !== "node_modules" &&
    !name.startsWith(".") &&
    !existsSync(path.join(directory, "package.json"))
  );
}

function findEntries(root: string) {
  const entries: string[] = [];
  const directories = [root];

  for (const directory of directories) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory() && shouldSearch(entryPath, entry.name)) {
        directories.push(entryPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".css") &&
        TAILWIND_IMPORT.test(readFileSync(entryPath, "utf8"))
      ) {
        entries.push(entryPath);
      }
    }
  }

  return entries;
}

function isSupportedTailwind(manifestPath: string) {
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));

  return (
    typeof manifest === "object" &&
    manifest !== null &&
    "version" in manifest &&
    typeof manifest.version === "string" &&
    SUPPORTED_VERSION.test(manifest.version)
  );
}

function loadProject(root: string) {
  const { path: manifest } = resolver.sync(root, "tailwindcss/package.json");
  const { path: tailwind } = resolver.sync(root, "tailwindcss");

  if (manifest === undefined || tailwind === undefined || !isSupportedTailwind(manifest)) {
    return;
  }

  const [entry] = findEntries(root)
    .toSorted((left, right) => left.localeCompare(right))
    .toSorted((left, right) => left.split(path.sep).length - right.split(path.sep).length);

  if (entry === undefined) {
    return { base: root, css: DEFAULT_CSS, tailwind };
  }

  return { base: path.dirname(entry), css: readFileSync(entry, "utf8"), tailwind };
}

export function findProject(filename: string) {
  const directory = path.dirname(filename);

  if (!packageRoots.has(directory)) {
    packageRoots.set(directory, findPackageRoot(directory));
  }

  const root = packageRoots.get(directory);

  if (root === undefined) {
    return;
  }

  if (!projects.has(root)) {
    projects.set(root, loadProject(root));
  }

  return projects.get(root);
}
