import type { Context, ESTree } from "@oxlint/plugins";

export type VisitorKeys = Context["sourceCode"]["visitorKeys"];

export function children(keys: VisitorKeys, node: ESTree.Node) {
  return (keys[node.type] ?? []).flatMap((key) => {
    const child: unknown = Reflect.get(node, key);
    const items: unknown[] = Array.isArray(child) ? child : [child];

    return items.filter(
      (item): item is ESTree.Node => typeof item === "object" && item !== null && "type" in item,
    );
  });
}

export function contains(
  keys: VisitorKeys,
  root: ESTree.Node,
  matches: (node: ESTree.Node) => boolean,
) {
  const pending = [root];

  for (const node of pending) {
    if (matches(node)) {
      return true;
    }

    pending.push(...children(keys, node));
  }

  return false;
}
