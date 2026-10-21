import type { Context, Definition, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { effectSetupOf } from "../shared/effects.ts";
import { isGlobalCall } from "../shared/globals.ts";
import { calleeName, isFunctionNode, isWrapper, memberName, unwrap } from "../shared/nodes.ts";
import { reactMajorVersion } from "../shared/project.ts";
import { definitionOf } from "../shared/scope.ts";

const CLIENTS = new Set(["axios.default", "ky.default", "ofetch.$fetch", "ofetch.ofetch"]);

const REQUEST_METHODS = new Set([
  "delete",
  "get",
  "head",
  "native",
  "options",
  "patch",
  "patchForm",
  "post",
  "postForm",
  "put",
  "putForm",
  "raw",
  "request",
]);

function importedName({ node, parent }: Definition) {
  if (parent?.type !== "ImportDeclaration" || node.type === "ImportNamespaceSpecifier") {
    return;
  }

  if (node.type !== "ImportSpecifier") {
    return `${parent.source.value}.default`;
  }

  const { imported } = node;

  return `${parent.source.value}.${imported.type === "Identifier" ? imported.name : imported.value}`;
}

function clientOf(context: Context, callee: ESTree.Node) {
  const target = unwrap(callee);
  const root = target.type === "MemberExpression" ? unwrap(target.object) : target;
  const definition = root.type === "Identifier" ? definitionOf(context, root) : undefined;

  if (
    definition?.type !== "ImportBinding" ||
    (target !== root && !REQUEST_METHODS.has(memberName(target) ?? "")) ||
    !CLIENTS.has(importedName(definition) ?? "")
  ) {
    return;
  }

  return context.sourceCode.getText(target);
}

function isInEffect(context: Context, node: ESTree.Node) {
  for (let current = node.parent; current !== null; current = current.parent) {
    let holder = current.parent;

    while (holder !== null && isWrapper(holder)) {
      holder = holder.parent;
    }

    if (
      isFunctionNode(current) &&
      holder?.type === "CallExpression" &&
      effectSetupOf(context, holder) === current
    ) {
      return true;
    }
  }

  return false;
}

export const reactNoFetchInEffect = defineRule({
  meta: {
    docs: {
      description:
        "Forbid fetching server data inside React effects, in favor of loaders, Server Components or TanStack Query.",
    },
    messages: {
      fetchInEffect:
        '"{{name}}" fetches server data in an effect, which waterfalls requests, races when inputs change and caches nothing. Fetch it in a route loader, a Server Component or TanStack Query instead.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      before() {
        return (
          context.sourceCode.text.includes("Effect") &&
          reactMajorVersion(context.filename) !== undefined
        );
      },
      CallExpression(node) {
        const isGlobalFetch = calleeName(node.callee) === "fetch" && isGlobalCall(context, node);
        const name = isGlobalFetch ? "fetch" : clientOf(context, node.callee);

        if (name === undefined || !isInEffect(context, node)) {
          return;
        }

        context.report({ data: { name }, messageId: "fetchInEffect", node });
      },
    };
  },
});
