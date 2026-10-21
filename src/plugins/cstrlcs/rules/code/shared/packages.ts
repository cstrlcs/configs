import { existsSync } from "node:fs";
import path from "node:path";

const packageRoots = new Map<string, string | undefined>();

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

export function packageRootOf(directory: string) {
  if (!packageRoots.has(directory)) {
    packageRoots.set(directory, findPackageRoot(directory));
  }

  return packageRoots.get(directory);
}
