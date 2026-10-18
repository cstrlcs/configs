import type { ESTree } from "@oxlint/plugins";

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

export function isFunctionExpression(node: ESTree.Node | null | undefined): node is FunctionNode {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}
