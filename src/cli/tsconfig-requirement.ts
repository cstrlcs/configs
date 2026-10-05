import type { Requirement } from "./check.ts";
import type { JsonObject } from "./json.ts";

import { check, json, write } from "./check.ts";
import { readText } from "./files.ts";
import { decodeJsonObject, dependencies, EMPTY_OBJECT, stringField } from "./json.ts";

const TSCONFIG_FILE = "tsconfig.json";
const BUN_DECLARATIONS_FILE = "bun.d.ts";
const BUN_TYPES_REFERENCE = '/// <reference types="bun" />';
const BUN_TEST_GLOBALS_REFERENCE = '/// <reference types="bun-types/test-globals" />';
const BUN_DECLARATIONS = `${BUN_TYPES_REFERENCE}\n${BUN_TEST_GLOBALS_REFERENCE}\n\nexport {};\n`;

async function readTsconfig(root: string) {
  const text = await readText(root, TSCONFIG_FILE);

  if (text === null) {
    return null;
  }

  const tsconfig = decodeJsonObject(text, Bun.JSONC.parse);

  if (tsconfig === null) {
    throw new Error(
      `${TSCONFIG_FILE} is not a valid JSON object. Fix it and run the command again.`,
    );
  }

  return tsconfig;
}

function fileListKey(tsconfig: JsonObject) {
  if (Array.isArray(tsconfig["include"])) {
    return "include";
  }

  return Array.isArray(tsconfig["files"]) ? "files" : undefined;
}

function includesBunDeclarations(tsconfig: JsonObject) {
  const key = fileListKey(tsconfig);
  const entries = key === undefined ? undefined : tsconfig[key];

  return !Array.isArray(entries) || entries.includes(BUN_DECLARATIONS_FILE);
}

function withBunDeclarations(tsconfig: JsonObject) {
  const key = fileListKey(tsconfig);

  if (key === undefined) {
    return tsconfig;
  }

  const entries = tsconfig[key];

  const others: readonly unknown[] = Array.isArray(entries)
    ? entries.filter((entry) => entry !== BUN_DECLARATIONS_FILE)
    : [];

  return { ...tsconfig, [key]: [...others, BUN_DECLARATIONS_FILE] };
}

function fixedTsconfig(tsconfig: JsonObject | null, extendsPath: string, isVite: boolean) {
  if (tsconfig === null) {
    return {
      extends: extendsPath,
      compilerOptions: { paths: { "@/*": ["./src/*"] } },
      include: ["src", BUN_DECLARATIONS_FILE],
      ...(isVite ? { exclude: ["dist", "node_modules"] } : {}),
    };
  }

  return { ...withBunDeclarations(tsconfig), extends: extendsPath };
}

function hasBunReferences(declarations: string) {
  const lines = new Set(declarations.split("\n"));

  return lines.has(BUN_TYPES_REFERENCE) && lines.has(BUN_TEST_GLOBALS_REFERENCE);
}

export const tsconfigRequirement: Requirement = {
  files: [TSCONFIG_FILE, BUN_DECLARATIONS_FILE],

  inspect: async ({ root, packageJson }) => {
    const [tsconfig, declarations] = await Promise.all([
      readTsconfig(root),
      readText(root, BUN_DECLARATIONS_FILE),
    ]);

    const isVite = Object.hasOwn(dependencies(packageJson), "vite");
    const extendsPath = `@cstrlcs/configs/tsconfig/${isVite ? "vite" : "base"}.json`;
    const extendsValue = stringField(tsconfig ?? EMPTY_OBJECT, "extends");
    const fixedTsconfigJson = json(fixedTsconfig(tsconfig, extendsPath, isVite));
    const includesDeclarations = tsconfig !== null && includesBunDeclarations(tsconfig);
    const hasReferences = hasBunReferences(declarations ?? "");

    return [
      check({
        passed: extendsValue === extendsPath,
        label: TSCONFIG_FILE,
        detail: `expected extends: "${extendsPath}", got: "${extendsValue}"`,
        fix: write({ [TSCONFIG_FILE]: fixedTsconfigJson }),
      }),
      check({
        passed: includesDeclarations && hasReferences,
        label: "Bun test globals",
        detail: `expected ${BUN_DECLARATIONS_FILE} with Bun references and ${TSCONFIG_FILE} inclusion`,
        fix: write({
          ...(includesDeclarations ? {} : { [TSCONFIG_FILE]: fixedTsconfigJson }),
          ...(hasReferences ? {} : { [BUN_DECLARATIONS_FILE]: BUN_DECLARATIONS }),
        }),
      }),
    ];
  },
};
