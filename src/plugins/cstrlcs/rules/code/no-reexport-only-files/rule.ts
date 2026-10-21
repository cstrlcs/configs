import type { ESTree } from "@oxlint/plugins";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineRule } from "@oxlint/plugins";

import { moduleExportName } from "../shared/ast.ts";
import { packageRootOf } from "../shared/packages.ts";

const DECLARATION_FILE = /\.d\.[cm]?ts$/v;
const MODULE_EXTENSION = /(?:\.d)?\.[cm]?[jt]sx?$/v;
const ENTRY_FIELDS = ["bin", "exports", "main", "module", "types"];
const BUILD_DIRECTORY = /^(?:\.\/)?(?:dist|build|lib|out)\//v;
const entryPatterns = new Map<string, RegExp[]>();

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function entryTargets(manifest: Readonly<Record<string, unknown>>) {
  const targets: string[] = [];
  const pending = ENTRY_FIELDS.map((field) => manifest[field]);

  for (const entry of pending) {
    if (typeof entry === "string") {
      targets.push(entry);
    }

    if (isRecord(entry)) {
      pending.push(...Object.values(entry));
    }
  }

  return targets;
}

function withoutExtension(filePath: string) {
  return filePath.replace(MODULE_EXTENSION, "");
}

function readEntryPatterns(root: string) {
  const manifest: unknown = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

  if (!isRecord(manifest)) {
    return [];
  }

  return entryTargets(manifest)
    .flatMap((target) => [target, target.replace(BUILD_DIRECTORY, "src/")])
    .map((target) => {
      const entry = RegExp.escape(withoutExtension(path.resolve(root, target)));

      return new RegExp(`^${entry.replaceAll(String.raw`\*`, ".*")}$`, "v");
    });
}

function isEntryPoint(filename: string) {
  const root = packageRootOf(path.dirname(filename));

  if (root === undefined) {
    return false;
  }

  if (!entryPatterns.has(root)) {
    entryPatterns.set(root, readEntryPatterns(root));
  }

  const file = withoutExtension(filename);

  return entryPatterns.get(root)?.some((pattern) => pattern.test(file)) ?? false;
}

function isReexport(statement: ESTree.Node, imported: ReadonlySet<string>) {
  if (statement.type === "ExportAllDeclaration") {
    return true;
  }

  if (statement.type === "ExportDefaultDeclaration") {
    return statement.declaration.type === "Identifier" && imported.has(statement.declaration.name);
  }

  if (statement.type !== "ExportNamedDeclaration") {
    return false;
  }

  if (statement.source !== null) {
    return true;
  }

  return (
    statement.declaration === null &&
    statement.specifiers.length > 0 &&
    statement.specifiers.every(({ local }) => imported.has(moduleExportName(local)))
  );
}

export const noReexportOnlyFiles = defineRule({
  meta: {
    docs: {
      description:
        "Forbid modules that only re-export other modules, unless package.json lists them as an entry point.",
    },
    messages: {
      reexportOnly:
        "This module only re-exports other modules. Import from the modules that define these exports instead.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      before() {
        return !DECLARATION_FILE.test(context.filename);
      },
      Program({ body }) {
        const statements = body.filter(
          (statement) =>
            statement.type !== "ExpressionStatement" || typeof statement.directive !== "string",
        );

        const imported = new Set(
          statements.flatMap((statement) =>
            statement.type === "ImportDeclaration"
              ? statement.specifiers.map(({ local }) => local.name)
              : [],
          ),
        );

        const reexport = statements.find((statement) => isReexport(statement, imported));

        if (reexport === undefined) {
          return;
        }

        if (
          !statements.every(
            (statement) =>
              statement.type === "ImportDeclaration" || isReexport(statement, imported),
          )
        ) {
          return;
        }

        if (isEntryPoint(context.filename)) {
          return;
        }

        context.report({ messageId: "reexportOnly", node: reexport });
      },
    };
  },
});
