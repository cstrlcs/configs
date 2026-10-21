import type { Context, ESTree } from "@oxlint/plugins";

import { unwrap } from "./nodes.ts";
import { definitionOf } from "./scope.ts";

const GLOBAL_OBJECTS = new Set(["global", "globalThis", "self", "window"]);

export function isGlobalObject(context: Context, node: ESTree.Node | undefined) {
  const target = node && unwrap(node);

  return (
    target?.type === "Identifier" &&
    GLOBAL_OBJECTS.has(target.name) &&
    definitionOf(context, target) === undefined
  );
}

export function isGlobalCall(context: Context, { callee }: ESTree.CallExpression) {
  const target = unwrap(callee);

  return target.type === "Identifier"
    ? definitionOf(context, target) === undefined
    : target.type === "MemberExpression" && isGlobalObject(context, target.object);
}
