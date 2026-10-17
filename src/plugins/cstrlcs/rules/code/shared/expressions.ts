import type { VisitorKeys } from "./ast.ts";
import type { ESTree } from "@oxlint/plugins";

import { children } from "./ast.ts";
import { unwrap } from "./constants.ts";

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

const COMPARISON_OPERATORS = new Set([
  "!=",
  "!==",
  "<",
  "<=",
  "==",
  "===",
  ">",
  ">=",
  "in",
  "instanceof",
]);

const ARITHMETIC_OPERATORS = new Set([
  "%",
  "&",
  "*",
  "**",
  "+",
  "-",
  "/",
  "<<",
  ">>",
  ">>>",
  "^",
  "|",
]);

const BOOLEAN_METHODS = new Set([
  "endsWith",
  "every",
  "has",
  "hasOwn",
  "includes",
  "isArray",
  "isFinite",
  "isInteger",
  "isNaN",
  "isSafeInteger",
  "some",
  "startsWith",
  "test",
]);

const NON_BOOLEAN_TYPES = new Set([
  "ArrayExpression",
  "ArrowFunctionExpression",
  "ClassExpression",
  "FunctionExpression",
  "JSXElement",
  "JSXFragment",
  "NewExpression",
  "ObjectExpression",
  "TemplateLiteral",
]);

const NESTED_SCOPE_TYPES = new Set([
  "ArrowFunctionExpression",
  "ClassDeclaration",
  "ClassExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const COMPONENT_FACTORIES = new Set(["createContext", "forwardRef", "lazy", "memo", "styled"]);
const NEUTRAL_UNARY_OPERATORS = new Set(["!", "delete", "void"]);

function leaves(root: ESTree.Expression) {
  const found: ESTree.Expression[] = [];
  const pending = [root];

  for (const node of pending) {
    const current = node.type === "TSAsExpression" ? node : unwrap(node);

    if (current.type === "LogicalExpression") {
      pending.push(current.left, current.right);
    } else if (current.type === "ConditionalExpression") {
      pending.push(current.consequent, current.alternate);
    } else {
      found.push(current);
    }
  }

  return found;
}

function calleeNames(callee: ESTree.Expression) {
  if (callee.type === "Identifier") {
    return [callee.name];
  }

  if (callee.type !== "MemberExpression" || callee.property.type !== "Identifier") {
    return [];
  }

  const owner = callee.object.type === "Identifier" ? [callee.object.name] : [];

  return [...owner, callee.property.name];
}

function isBooleanCall({ callee }: ESTree.CallExpression) {
  const names = calleeNames(callee);

  if (callee.type === "Identifier") {
    return names.includes("Boolean");
  }

  return BOOLEAN_METHODS.has(names.at(-1) ?? "");
}

function isBooleanLeaf(node: ESTree.Expression) {
  if (node.type === "Literal") {
    return typeof node.value === "boolean";
  }

  if (node.type === "UnaryExpression") {
    return node.operator === "!";
  }

  if (node.type === "BinaryExpression") {
    return COMPARISON_OPERATORS.has(node.operator);
  }

  if (node.type === "CallExpression") {
    return isBooleanCall(node);
  }

  return node.type === "TSAsExpression" && node.typeAnnotation.type === "TSBooleanKeyword";
}

function isNonBooleanLeaf(node: ESTree.Expression) {
  if (NON_BOOLEAN_TYPES.has(node.type)) {
    return true;
  }

  if (node.type === "Literal") {
    return typeof node.value !== "boolean" && node.value !== null;
  }

  if (node.type === "UnaryExpression") {
    return !NEUTRAL_UNARY_OPERATORS.has(node.operator);
  }

  return node.type === "BinaryExpression" && ARITHMETIC_OPERATORS.has(node.operator);
}

export function isBooleanExpression(node: ESTree.Expression) {
  return leaves(node).every((leaf) => isBooleanLeaf(leaf));
}

export function isNonBooleanExpression(node: ESTree.Expression) {
  return leaves(node).every((leaf) => isNonBooleanLeaf(leaf));
}

export function returnedExpressions(keys: VisitorKeys, { body }: FunctionNode) {
  if (body?.type !== "BlockStatement") {
    return body === null ? [] : [body];
  }

  const found: (ESTree.Expression | null)[] = [];
  const pending: ESTree.Node[] = [...body.body];

  for (const node of pending) {
    if (node.type === "ReturnStatement") {
      found.push(node.argument);
    } else if (!NESTED_SCOPE_TYPES.has(node.type)) {
      pending.push(...children(keys, node));
    }
  }

  return found;
}

export function returnsJsx(keys: VisitorKeys, node: FunctionNode) {
  return returnedExpressions(keys, node).some(
    (returned) =>
      returned !== null &&
      leaves(returned).some((leaf) => leaf.type === "JSXElement" || leaf.type === "JSXFragment"),
  );
}

export function isComponentFactory(node: ESTree.Expression) {
  const current = unwrap(node);

  const callee =
    current.type === "TaggedTemplateExpression"
      ? current.tag
      : current.type === "CallExpression"
        ? current.callee
        : undefined;

  const target = callee?.type === "CallExpression" ? callee.callee : callee;

  return target !== undefined && calleeNames(target).some((name) => COMPONENT_FACTORIES.has(name));
}
