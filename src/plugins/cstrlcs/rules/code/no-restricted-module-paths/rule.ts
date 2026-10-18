import type { Context, ESTree } from "@oxlint/plugins";
import path from "node:path";
import { defineRule } from "@oxlint/plugins";

import { staticString } from "../shared/constants.ts";

const BIN_FILE = /(?:^|[\/\\])bin(?:[\/\\]|\.[cm]?[jt]sx?$)/v;
const LOCAL_DIST = /^\..*\/dist(?:\/|$)/v;
const NODE_MODULES = /(?:^|\/)node_modules\//v;

function check(context: Context, node: ESTree.Node, source: string | undefined) {
  if (source === undefined) {
    return;
  }

  if (NODE_MODULES.test(source)) {
    context.report({ data: { source }, messageId: "nodeModules", node });

    return;
  }

  if (source === "dist" || LOCAL_DIST.test(source)) {
    context.report({ data: { source }, messageId: "dist", node });
  }
}

export const noRestrictedModulePaths = defineRule({
  meta: {
    docs: {
      description:
        "Forbid importing from a local dist folder or reaching into node_modules by path.",
    },
    messages: {
      dist: '"{{source}}" imports build output from a dist folder. Import the source module or the package name instead.',
      nodeModules:
        '"{{source}}" reaches into node_modules by path. Import the package by its name instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    return {
      before() {
        return !BIN_FILE.test(path.relative(context.cwd, context.filename));
      },
      CallExpression({ arguments: [source], callee }) {
        if (callee.type !== "Identifier" || callee.name !== "require" || source === undefined) {
          return;
        }

        check(context, source, staticString(source));
      },
      ExportAllDeclaration(node) {
        check(context, node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null) {
          check(context, node.source, node.source.value);
        }
      },
      ImportDeclaration(node) {
        check(context, node.source, node.source.value);
      },
      ImportExpression({ source }) {
        check(context, source, staticString(source));
      },
      TSExternalModuleReference({ expression }) {
        check(context, expression, expression.value);
      },
    };
  },
});
