import type { Context, ESTree } from "@oxlint/plugins";
import path from "node:path";
import { defineRule } from "@oxlint/plugins";

import { moduleExportName } from "../shared/ast.ts";
import { staticString } from "../shared/constants.ts";
import { isTestOrConfigFile } from "../shared/files.ts";
import { variableOf } from "../shared/scope.ts";

const ENV_FILE = /^env\.[cm]?[jt]s$/v;
const ENV_GLOBALS = new Set(["Bun", "process"]);
const PROCESS_MODULES = new Set(["node:process", "process"]);

function isProcessImport(definition: ESTree.Node | null) {
  return definition?.type === "ImportDeclaration" && PROCESS_MODULES.has(definition.source.value);
}

function isEnvOwner(context: Context, node: ESTree.Node) {
  if (node.type === "MetaProperty") {
    return node.meta.name === "import" && node.property.name === "meta";
  }

  if (node.type !== "Identifier") {
    return false;
  }

  const [definition] = variableOf(context, node)?.defs ?? [];

  if (definition === undefined) {
    return ENV_GLOBALS.has(node.name);
  }

  return definition.type === "ImportBinding" && isProcessImport(definition.parent);
}

function keyName(key: ESTree.PropertyKey, computed: boolean) {
  if (computed) {
    return staticString(key);
  }

  return key.type === "Identifier" ? key.name : staticString(key);
}

export const noEnvAccess = defineRule({
  meta: {
    docs: { description: "Forbid reading the environment outside the project's env.ts module." },
    messages: {
      envAccess:
        "Read the environment through the project's env.ts module, which parses it once with a schema.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      before() {
        return (
          !ENV_FILE.test(path.basename(context.filename)) && !isTestOrConfigFile(context.filename)
        );
      },
      ExportNamedDeclaration(node) {
        if (node.source === null || !PROCESS_MODULES.has(node.source.value)) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (moduleExportName(specifier.local) === "env") {
            context.report({ messageId: "envAccess", node: specifier });
          }
        }
      },
      ImportDeclaration(node) {
        if (!PROCESS_MODULES.has(node.source.value)) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            moduleExportName(specifier.imported) === "env"
          ) {
            context.report({ messageId: "envAccess", node: specifier });
          }
        }
      },
      MemberExpression(node) {
        if (node.property.type === "PrivateIdentifier") {
          return;
        }

        if (keyName(node.property, node.computed) === "env" && isEnvOwner(context, node.object)) {
          context.report({ messageId: "envAccess", node });
        }
      },
      VariableDeclarator({ id, init }) {
        if (id.type !== "ObjectPattern" || init === null || !isEnvOwner(context, init)) {
          return;
        }

        for (const property of id.properties) {
          if (property.type === "Property" && keyName(property.key, property.computed) === "env") {
            context.report({ messageId: "envAccess", node: property });
          }
        }
      },
    };
  },
});
