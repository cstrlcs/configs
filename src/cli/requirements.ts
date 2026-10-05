import type { Fix, Requirement } from "./check.ts";
import type { JsonObject } from "./json.ts";
import type { Project } from "./project.ts";
import { semver } from "bun";

import { check, expectation, json, manual, write } from "./check.ts";
import { isDirectory, readJson, readText, scanGlob, stripDotSlash, writeFiles } from "./files.ts";
import { declaredDependencyVersion, dependencies, objectField, stringField } from "./json.ts";
import { CONFIGS_DIR, REQUIRED_DEPENDENCIES, readPeers } from "./package-manager.ts";
import { packageDirs } from "./project.ts";
import { tsconfigRequirement } from "./tsconfig-requirement.ts";

const SUPPORTED_BUN_RANGE = ">=1.4.0";
const LINT_SCRIPT = "oxlint --type-aware .";
const LINT_FIX_SCRIPT = "oxlint --type-aware --fix; s=$?; oxfmt; exit $s";

const GITATTRIBUTES = `* text=auto
*.* text eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.ico binary`;

const EDITORCONFIG = `root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true`;

const REQUIRED_GITIGNORE = [
  ".env",
  ".env.*",
  "!.env.example",
  "node_modules",
  ".DS_Store",
  ".claude",
];

const CONFLICTING_CONFIGS = [
  ".eslintrc",
  ".eslintrc.*",
  "eslint.config.*",
  ".prettierrc",
  ".prettierrc.*",
  "prettier.config.*",
  "biome.json",
  "biome.jsonc",
  ".oxlintrc.json",
  "*.code-workspace",
];

function isBunSupported(version: string) {
  return semver.satisfies(version.replace(/-.*$/u, ""), SUPPORTED_BUN_RANGE);
}

export function checkBunRuntime(version = Bun.version) {
  return check({
    passed: isBunSupported(version),
    label: `Bun ${version}`,
    detail: `required: ${SUPPORTED_BUN_RANGE}`,
    fix: manual("Upgrade Bun with 'bun upgrade'"),
  });
}

const bunRuntimeRequirement: Requirement = {
  files: [],
  inspect: () => [checkBunRuntime()],
};

function isSupportedPackageManager(packageManager: string) {
  return packageManager.startsWith("bun@") && isBunSupported(packageManager.slice("bun@".length));
}

function fixedPackageJson(packageJson: JsonObject, root: string) {
  const name = stringField(packageJson, "name");
  const packageManager = stringField(packageJson, "packageManager");
  const { private: isPrivate } = packageJson;

  return {
    ...packageJson,
    name: name === "" ? (root.split("/").at(-1) ?? "") : name,
    packageManager: isSupportedPackageManager(packageManager)
      ? packageManager
      : `bun@${Bun.version}`,
    private: typeof isPrivate === "boolean" ? isPrivate : true,
    scripts: {
      ...objectField(packageJson, "scripts"),
      lint: LINT_SCRIPT,
      "lint:fix": LINT_FIX_SCRIPT,
    },
    type: "module",
  };
}

const packageJsonRequirement: Requirement = {
  files: ["package.json"],

  inspect: ({ packageJson, root }) => {
    const fixed = fixedPackageJson(packageJson, root);
    const fix = write({ "package.json": json(fixed) });
    const packageManager = stringField(packageJson, "packageManager");
    const scripts = objectField(packageJson, "scripts");

    return [
      {
        passed: packageManager === fixed.packageManager,
        label: "package.json packageManager",
        detail: `expected: "bun@${SUPPORTED_BUN_RANGE}", got: "${packageManager}"`,
      },
      { passed: packageJson["name"] === fixed.name, label: "package.json name", detail: "missing" },
      {
        passed: packageJson["private"] === fixed.private,
        label: "package.json private",
        detail: "expected: true or false",
      },
      expectation("package.json type", stringField(packageJson, "type"), fixed.type),
      expectation("package.json scripts.lint", stringField(scripts, "lint"), LINT_SCRIPT),
      expectation(
        "package.json scripts.lint:fix",
        stringField(scripts, "lint:fix"),
        LINT_FIX_SCRIPT,
      ),
    ].map((input) => check({ ...input, fix }));
  },
};

const workspacesRequirement: Requirement = {
  files: [],

  inspect: async ({ root, dirs, workspacePatterns }) => {
    if (!(await isDirectory(`${root}/apps`))) {
      return [];
    }

    if (workspacePatterns.length === 0) {
      return [
        check({
          passed: false,
          label: "package.json workspaces",
          detail: "required because apps/ exists",
          fix: manual('Add "workspaces": ["apps/*"] to package.json'),
        }),
      ];
    }

    const apps = await packageDirs(root, "apps/*");
    const uncovered = apps.filter((dir) => !dirs.includes(dir)).toSorted();

    return [
      check({
        passed: uncovered.length === 0,
        label: "package.json workspaces",
        detail: `packages not covered: ${uncovered.join(" ")}`,
        fix: manual(`Add ${uncovered.join(", ")} to "workspaces" in package.json`),
      }),
    ];
  },
};

function exactFileRequirement(path: string, expected: string) {
  return {
    files: [path],

    inspect: async ({ root }) => {
      const content = await readText(root, path);

      return [
        check({
          passed: content?.replace(/\n+$/u, "") === expected,
          label: path,
          detail: content === null ? "missing" : "differs from the expected content",
          fix: write({ [path]: `${expected}\n` }),
        }),
      ];
    },
  } satisfies Requirement;
}

const gitignoreRequirement: Requirement = {
  files: [".gitignore"],

  inspect: async ({ root }) => {
    const current = (await readText(root, ".gitignore")) ?? "";
    const lines = new Set(current.split("\n"));
    const missing = REQUIRED_GITIGNORE.filter((entry) => !lines.has(entry));
    const separator = current === "" || current.endsWith("\n") ? "" : "\n";

    return [
      check({
        passed: missing.length === 0,
        label: ".gitignore",
        detail: `missing: ${missing.join(" ")}`,
        fix: write({
          ".gitignore": `${current}${separator}${missing.map((entry) => `${entry}\n`).join("")}`,
        }),
      }),
    ];
  },
};

async function presetFor({ root, dirs }: Project) {
  const manifests = await Promise.all(dirs.map((dir) => readJson(root, `${dir}/package.json`)));

  const projectDependencies = new Set(
    manifests.flatMap((manifest) => Object.keys(dependencies(manifest))),
  );

  if (projectDependencies.has("vue")) {
    return "vue";
  }

  return projectDependencies.has("react") ? "react" : "base";
}

function toolConfigRequirement(
  tool: string,
  presetOf: (project: Project) => string | Promise<string>,
) {
  const path = `${tool}.config.ts`;

  return {
    files: [path],

    inspect: async (project) => {
      const [preset, content] = await Promise.all([
        presetOf(project),
        readText(project.root, path),
      ]);

      const specifier = `"@cstrlcs/configs/${tool}/${preset}.js"`;

      return [
        check({
          passed: content?.includes(specifier) === true,
          label: path,
          detail: `expected import: ${specifier}`,
          fix: write({
            [path]: `import { defineConfig } from "${tool}";

import config from ${specifier};

export default defineConfig(config);
`,
          }),
        }),
      ];
    },
  } satisfies Requirement;
}

function vscodeFileRequirement(name: string) {
  const path = `.vscode/${name}`;

  return {
    files: [path],

    inspect: async ({ root }) => {
      const [expected, actual] = await Promise.all([
        readText(root, `${CONFIGS_DIR}/${path}`),
        readText(root, path),
      ]);

      return [
        check({
          passed: expected !== null && expected === actual,
          label: path,
          detail: actual === null ? "missing" : "differs from the shipped file",
          fix:
            expected === null
              ? manual(`Reinstall @cstrlcs/configs: its ${path} is missing`)
              : write({ [path]: expected }),
        }),
      ];
    },
  } satisfies Requirement;
}

async function conflictingConfigsIn(root: string, dir: string) {
  const matches = await Promise.all(
    CONFLICTING_CONFIGS.flatMap((name) => [name, `.vscode/${name}`]).map((pattern) =>
      scanGlob(pattern, { cwd: `${root}/${dir}`, dot: true, onlyFiles: false }),
    ),
  );

  const files = matches.flat().map((file) => stripDotSlash(`${dir}/${file}`));
  const nestedSettings = `${dir}/.vscode/settings.json`;

  if (dir !== "." && (await readText(root, nestedSettings)) !== null) {
    files.push(nestedSettings);
  }

  return files;
}

const conflictingConfigsRequirement: Requirement = {
  files: [],

  inspect: async ({ root, dirs }) => {
    const found = await Promise.all(dirs.map((dir) => conflictingConfigsIn(root, dir)));
    const conflicting = found.flat();

    return [
      check({
        passed: conflicting.length === 0,
        label: "No conflicting tool configs",
        detail: `found: ${conflicting.join(" ")}`,
        fix: manual(
          "Delete these files: oxlint, oxfmt and the shipped editor settings replace them",
        ),
      }),
    ];
  },
};

const INSTALL_DEPENDENCIES: Fix = { kind: "install-dependencies" };

const dependenciesRequirement: Requirement = {
  files: [],

  inspect: async ({ root, packageJson }) => {
    const peers = await readPeers(root);

    const peerChecks = await Promise.all(
      peers.map(async ({ name, version }) => {
        const installedPackage = await readJson(root, `node_modules/${name}/package.json`);
        const declared = declaredDependencyVersion(packageJson, name);
        const installed = stringField(installedPackage, "version");

        return {
          passed: declared === version && installed === version,
          label: `${name} ${version}`,
          detail: `declared: "${declared}", installed: "${installed}"`,
        };
      }),
    );

    const declared = dependencies(packageJson);
    const configsVersion = declaredDependencyVersion(packageJson, "@cstrlcs/configs");

    return [
      ...REQUIRED_DEPENDENCIES.map((name) => ({
        passed: Object.hasOwn(declared, name),
        label: name,
        detail: "not found in package.json",
      })),
      {
        passed: /^\d+\.\d+\.\d+$/u.test(configsVersion),
        label: "@cstrlcs/configs pinned",
        detail: `expected an exact version, got: "${configsVersion}"`,
      },
      ...peerChecks,
    ].map((input) => check({ ...input, fix: INSTALL_DEPENDENCIES }));
  },
};

const REQUIREMENTS: readonly Requirement[] = [
  bunRuntimeRequirement,
  packageJsonRequirement,
  workspacesRequirement,
  exactFileRequirement(".gitattributes", GITATTRIBUTES),
  exactFileRequirement(".editorconfig", EDITORCONFIG),
  gitignoreRequirement,
  tsconfigRequirement,
  toolConfigRequirement("oxlint", presetFor),
  toolConfigRequirement("oxfmt", () => "base"),
  vscodeFileRequirement("settings.json"),
  vscodeFileRequirement("extensions.json"),
  conflictingConfigsRequirement,
  dependenciesRequirement,
];

export const MANAGED_FILES = REQUIREMENTS.flatMap(({ files }) => files);

export async function diagnose(project: Project) {
  const checks = await Promise.all(
    REQUIREMENTS.map(async (requirement) => requirement.inspect(project)),
  );

  return checks.flat();
}

export async function repair(project: Project, signal?: AbortSignal) {
  const checks = await diagnose(project);
  const failed = checks.filter(({ passed }) => !passed);

  signal?.throwIfAborted();

  await writeFiles(
    project.root,
    Object.fromEntries(
      failed.flatMap(({ fix }) => (fix.kind === "write" ? Object.entries(fix.files) : [])),
    ),
  );

  return failed.filter(({ fix }) => fix.kind !== "write");
}
