import type { Context, ESTree } from "@oxlint/plugins";

export function tokenValues(context: Context, node: ESTree.Node) {
  return context.sourceCode.getTokens(node).map(({ value }) => value);
}
