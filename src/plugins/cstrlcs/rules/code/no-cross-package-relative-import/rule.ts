import type { Ranged } from "@oxlint/plugins";
import path from "node:path";
import { defineRule } from "@oxlint/plugins";

import { staticString } from "../shared/constants.ts";
import { packageRootOf } from "../shared/packages.ts";

const RELATIVE = /^\.\.?(?:\/|$)/v;

function isOutside(root: string, target: string) {
  const relative = path.relative(root, target);

  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

export const noCrossPackageRelativeImport = defineRule({
  meta: {
    docs: {
      description: "Forbid relative imports that reach outside the importing file's package.",
    },
    messages: {
      crossPackage:
        '"{{source}}" reaches outside this package. Depend on the package by name and import its exports instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    let root: string | undefined;

    function check(node: Ranged, source: string | undefined) {
      if (root === undefined || source === undefined || !RELATIVE.test(source)) {
        return;
      }

      if (isOutside(root, path.resolve(path.dirname(context.filename), source))) {
        context.report({ data: { source }, messageId: "crossPackage", node });
      }
    }

    return {
      before() {
        root = packageRootOf(path.dirname(context.filename));

        return root !== undefined;
      },
      ExportAllDeclaration(node) {
        check(node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null) {
          check(node.source, node.source.value);
        }
      },
      ImportDeclaration(node) {
        check(node.source, node.source.value);
      },
      ImportExpression({ source }) {
        check(source, staticString(source));
      },
      TSImportType({ source }) {
        check(source, source.value);
      },
    };
  },
});
