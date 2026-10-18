import type { ESTree } from "@oxlint/plugins";

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;
export type Identifier = Extract<ESTree.Node, { type: "Identifier" }>;

type Wrapper = Extract<ESTree.Node, { expression: ESTree.Node }>;

const WRAPPER_TYPES = new Set([
  "ChainExpression",
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSInstantiationExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

export function isWrapper(node: ESTree.Node): node is Wrapper {
  return WRAPPER_TYPES.has(node.type);
}

export function unwrap(node: ESTree.Node) {
  let current = node;

  while (isWrapper(current)) {
    current = current.expression;
  }

  return current;
}

export function isFunctionNode(node: ESTree.Node | null | undefined): node is FunctionNode {
  return node !== undefined && node !== null && FUNCTION_TYPES.has(node.type);
}

export function memberName(node: ESTree.Node) {
  return node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier"
    ? node.property.name
    : undefined;
}

export function calleeName(callee: ESTree.Node) {
  const target = unwrap(callee);

  return target.type === "Identifier" ? target.name : memberName(target);
}
