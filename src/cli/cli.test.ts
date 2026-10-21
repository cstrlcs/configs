import type { JsonObject } from "./json.ts";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

import { objectField, parseJsonObject, stringField } from "./json.ts";

const repository = path.resolve(import.meta.dirname, "../..");
const BEGIN = "<!-- BEGIN @cstrlcs/configs -->";
const END = "<!-- END @cstrlcs/configs -->";
const LIBRARY_IMPORT = 'import library from "@cstrlcs/configs/oxlint/library.js";';
const LIBRARY_TSCONFIG = "@cstrlcs/configs/tsconfig/library.json";
const ASTRO_COMPILER = "0.5.2";

const BINS: Readonly<Record<string, string>> = {
  knip: "knip",
  oxfmt: "oxfmt",
  oxlint: "oxlint",
  sherif: "sherif",
  typescript: "tsc",
};

interface Fixture {
  readonly bun: string;
  readonly fakeBin: string;
  readonly peers: JsonObject;
  readonly addPeers: string;
  readonly block: string;
  readonly roots: string[];
}

let fixture: Fixture;

function writeProjectFile(root: string, relative: string, content: string) {
  mkdirSync(path.dirname(`${root}/${relative}`), { recursive: true });
  writeFileSync(`${root}/${relative}`, content);
}

function writeFakePackage(root: string, name: string, version: string) {
  const dir = `${root}/node_modules/${name}`;
  const bin = BINS[name];

  writeProjectFile(
    root,
    `node_modules/${name}/package.json`,
    JSON.stringify({
      name,
      version,
      type: "module",
      main: "index.js",
      ...(bin === undefined ? {} : { bin: { [bin]: "bin.js" } }),
    }),
  );

  writeFileSync(`${dir}/index.js`, "export const defineConfig = (config) => config;\n");

  writeFileSync(
    `${dir}/bin.js`,
    `import { appendFileSync } from "node:fs";
appendFileSync("calls.log", [${JSON.stringify(bin)}, ...process.argv.slice(2)].join(" ") + "\\n");
process.exitCode = process.env.FAILING_TOOL === ${JSON.stringify(bin)} ? 1 : 0;
`,
  );
}

function createProject(
  packageJson: Readonly<Record<string, unknown>> = {},
  files: Readonly<Record<string, string>> = {},
) {
  const root = mkdtempSync(path.join(tmpdir(), "cstrlcs-configs-project-"));

  fixture.roots.push(root);

  writeProjectFile(
    root,
    "package.json",
    JSON.stringify({
      name: "fixture",
      private: true,
      ...packageJson,
      devDependencies: {
        "@cstrlcs/configs": "12.0.0",
        "@types/bun": "1.4.0",
        "bun-types": "1.4.0",
        ...fixture.peers,
      },
    }),
  );

  for (const [relative, content] of Object.entries(files)) {
    writeProjectFile(root, relative, content);
  }

  mkdirSync(`${root}/node_modules/@cstrlcs`, { recursive: true });
  symlinkSync(repository, `${root}/node_modules/@cstrlcs/configs`);

  for (const name of Object.keys(fixture.peers)) {
    writeFakePackage(root, name, stringField(fixture.peers, name));
  }

  return root;
}

function cli(root: string, command: string, env: Readonly<Record<string, string>> = {}) {
  return spawnSync(
    fixture.bun,
    [
      `${import.meta.dirname}/main.ts`,
      command,
      "--cwd",
      root,
      ...(command === "install" ? ["--yes"] : []),
    ],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: `${fixture.fakeBin}:${process.env["PATH"] ?? ""}`, ...env },
    },
  );
}

function installedProject(
  packageJson: Readonly<Record<string, unknown>> = {},
  files: Readonly<Record<string, string>> = {},
) {
  const root = createProject(packageJson, files);

  cli(root, "install");

  return root;
}

function readProjectFile(root: string, relative: string) {
  return readFileSync(`${root}/${relative}`, "utf8");
}

function lines(root: string, relative: string) {
  return readProjectFile(root, relative).trimEnd().split("\n");
}

describe("cstrlcs-configs", () => {
  beforeAll(() => {
    const fakeBin = mkdtempSync(path.join(tmpdir(), "cstrlcs-configs-bin-"));
    const manifest = parseJsonObject(readFileSync(`${repository}/package.json`, "utf8"));
    const shipped = readFileSync(`${repository}/agents/AGENTS.md`, "utf8").trimEnd();

    writeFileSync(`${fakeBin}/bun`, '#!/bin/sh\necho "$*" >> bun.log\n', { mode: 0o755 });

    const optional = objectField(manifest, "peerDependenciesMeta");

    const peers = Object.fromEntries(
      Object.entries(objectField(manifest, "peerDependencies")).filter(
        ([name]) => !Object.hasOwn(optional, name),
      ),
    );

    fixture = {
      bun: execFileSync("which", ["bun"], { encoding: "utf8" }).trim(),
      fakeBin,
      peers,
      addPeers: `add -D --exact ${Object.keys(peers)
        .map((name) => `${name}@${stringField(peers, name)}`)
        .join(" ")}`,
      block: `${BEGIN}\n\n${shipped}\n\n${END}`,
      roots: [fakeBin],
    };
  });

  afterAll(() => {
    for (const root of fixture.roots) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  describe("install", () => {
    test("adds every peer dependency, knip and sherif included, at its exact version", () => {
      expect.assertions(1);

      const root = installedProject();

      expect(lines(root, "bun.log")).toContain(fixture.addPeers);
    });

    test("adds @astrojs/compiler-rs at its exact version when astro is a dependency", () => {
      expect.assertions(1);

      const root = installedProject({ dependencies: { astro: "7.4.1" } });

      expect(lines(root, "bun.log")).toContain(
        fixture.addPeers.replace("--exact ", `--exact @astrojs/compiler-rs@${ASTRO_COMPILER} `),
      );
    });

    test("creates AGENTS.md with only the managed block", () => {
      expect.assertions(1);
      expect(readProjectFile(installedProject(), "AGENTS.md")).toBe(`${fixture.block}\n`);
    });

    test("appends the managed block after existing AGENTS.md content", () => {
      expect.assertions(1);

      const root = installedProject({}, { "AGENTS.md": "# Project\n\nKeep this.\n" });

      expect(readProjectFile(root, "AGENTS.md")).toBe(
        `# Project\n\nKeep this.\n\n${fixture.block}\n`,
      );
    });

    test("replaces only the content between the markers", () => {
      expect.assertions(1);

      const root = installedProject(
        {},
        { "AGENTS.md": `# Top\n\n${BEGIN}\nOutdated rules.\n${END}\n\n## Bottom\n` },
      );

      expect(readProjectFile(root, "AGENTS.md")).toBe(`# Top\n\n${fixture.block}\n\n## Bottom\n`);
    });

    test("adds the library presets when private is false", () => {
      expect.assertions(3);

      const root = installedProject({ private: false });
      const oxlintConfig = readProjectFile(root, "oxlint.config.ts");

      expect(oxlintConfig).toContain(LIBRARY_IMPORT);
      expect(oxlintConfig).toContain("extends: [config, library],");

      expect(parseJsonObject(readProjectFile(root, "tsconfig.json"))["extends"]).toStrictEqual([
        "@cstrlcs/configs/tsconfig/base.json",
        LIBRARY_TSCONFIG,
      ]);
    });

    test("keeps the single presets when private is not false", () => {
      expect.assertions(3);

      const root = installedProject({ private: true });
      const oxlintConfig = readProjectFile(root, "oxlint.config.ts");

      expect(oxlintConfig).not.toContain(LIBRARY_IMPORT);
      expect(oxlintConfig).toContain("extends: [config],");

      expect(parseJsonObject(readProjectFile(root, "tsconfig.json"))["extends"]).toBe(
        "@cstrlcs/configs/tsconfig/base.json",
      );
    });
  });

  describe("doctor", () => {
    test("passes right after install", () => {
      expect.assertions(1);
      expect(cli(installedProject(), "doctor").status).toBe(0);
    });

    test("fails when an astro project lacks @astrojs/compiler-rs", () => {
      expect.assertions(2);

      const { status, stdout } = cli(
        installedProject({ dependencies: { astro: "7.4.1" } }),
        "doctor",
      );

      expect(status).toBe(1);

      expect(stdout).toContain(
        `❌ @astrojs/compiler-rs ${ASTRO_COMPILER} (declared: "", installed: "")`,
      );
    });

    test("accepts an astro project with @astrojs/compiler-rs pinned and installed", () => {
      expect.assertions(1);

      const root = installedProject({ dependencies: { astro: "7.4.1" } });
      const packageJson = parseJsonObject(readProjectFile(root, "package.json"));

      writeProjectFile(
        root,
        "package.json",
        JSON.stringify({
          ...packageJson,
          devDependencies: {
            ...objectField(packageJson, "devDependencies"),
            "@astrojs/compiler-rs": ASTRO_COMPILER,
          },
        }),
      );

      writeFakePackage(root, "@astrojs/compiler-rs", ASTRO_COMPILER);
      expect(cli(root, "doctor").status).toBe(0);
    });

    test("fails when the AGENTS.md block differs from the shipped content", () => {
      expect.assertions(2);

      const root = installedProject();

      writeProjectFile(root, "AGENTS.md", `${BEGIN}\nEdited rules.\n${END}\n`);

      const { status, stdout } = cli(root, "doctor");

      expect(status).toBe(1);

      expect(stdout).toContain(
        "❌ AGENTS.md @cstrlcs/configs block (differs from the shipped content)",
      );
    });

    test("fails when AGENTS.md has no managed block", () => {
      expect.assertions(2);

      const root = installedProject();

      writeProjectFile(root, "AGENTS.md", "# Project\n");

      const { status, stdout } = cli(root, "doctor");

      expect(status).toBe(1);
      expect(stdout).toContain("❌ AGENTS.md @cstrlcs/configs block (missing)");
    });

    test("accepts the library presets that install writes", () => {
      expect.assertions(2);

      const { stdout } = cli(installedProject({ private: false }), "doctor");

      expect(stdout).toContain("✅ oxlint.config.ts\n");
      expect(stdout).toContain("✅ tsconfig.json\n");
    });

    test("expects the library presets once private becomes false", () => {
      expect.assertions(2);

      const root = installedProject();
      const packageJson = parseJsonObject(readProjectFile(root, "package.json"));

      writeProjectFile(root, "package.json", JSON.stringify({ ...packageJson, private: false }));

      const { stdout } = cli(root, "doctor");

      expect(stdout).toContain(
        '❌ oxlint.config.ts (expected imports: "@cstrlcs/configs/oxlint/base.js", "@cstrlcs/configs/oxlint/library.js")',
      );

      expect(stdout).toContain(
        `❌ tsconfig.json (expected extends: ["@cstrlcs/configs/tsconfig/base.json","${LIBRARY_TSCONFIG}"], got: "@cstrlcs/configs/tsconfig/base.json")`,
      );
    });

    test("rejects the library presets when private is true", () => {
      expect.assertions(1);

      const root = installedProject({ private: false });
      const packageJson = parseJsonObject(readProjectFile(root, "package.json"));

      writeProjectFile(root, "package.json", JSON.stringify({ ...packageJson, private: true }));

      expect(cli(root, "doctor").stdout).toContain(
        '❌ oxlint.config.ts (expected imports: "@cstrlcs/configs/oxlint/base.js")',
      );
    });
  });

  describe("lint and fix", () => {
    test.each([
      ["lint", ["oxlint --type-aware .", "oxfmt --check", "knip", "tsc --noEmit -p ."]],
      ["fix", ["oxlint --type-aware --fix", "oxfmt", "knip", "tsc --noEmit -p ."]],
    ])("%s runs knip and skips sherif without workspaces", (command, expected) => {
      expect.assertions(1);

      const root = installedProject();

      cli(root, command);
      expect(lines(root, "calls.log")).toStrictEqual(expected);
    });

    test.each([
      ["lint", ["oxlint --type-aware .", "oxfmt --check", "knip", "sherif", "tsc --noEmit -p ."]],
      ["fix", ["oxlint --type-aware --fix", "oxfmt", "knip", "sherif", "tsc --noEmit -p ."]],
    ])("%s runs sherif when workspaces are declared", (command, expected) => {
      expect.assertions(1);

      const root = installedProject(
        { workspaces: ["packages/*"] },
        { "packages/app/package.json": JSON.stringify({ name: "app", private: true }) },
      );

      cli(root, command);
      expect(lines(root, "calls.log")).toStrictEqual(expected);
    });

    test("a failing knip fails the command after every step runs", () => {
      expect.assertions(3);

      const root = installedProject();
      const { status, stderr } = cli(root, "lint", { FAILING_TOOL: "knip" });

      expect(status).toBe(1);
      expect(stderr).toContain("knip failed");
      expect(lines(root, "calls.log")).toContain("tsc --noEmit -p .");
    });
  });
});
