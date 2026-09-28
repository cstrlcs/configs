import { ResolverFactory } from "oxc-resolver";

const resolver = new ResolverFactory({
  builtinModules: true,
  conditionNames: ["node", "import"],
  extensionAlias: {
    ".cjs": [".cts", ".cjs"],
    ".js": [".ts", ".tsx", ".js", ".jsx"],
    ".mjs": [".mts", ".mjs"],
  },
  extensions: [".ts", ".tsx", ".d.ts", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  tsconfig: "auto",
});

function toPosix(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

export function toRelativePath(cwd: string, filePath: string) {
  const posixCwd = toPosix(cwd);
  const posixPath = toPosix(filePath);

  return posixPath.startsWith(`${posixCwd}/`) ? posixPath.slice(posixCwd.length + 1) : posixPath;
}

export function resolveSpecifier(importer: string, specifier: string) {
  return resolver.resolveFileSync(importer, specifier).path ?? specifier;
}
