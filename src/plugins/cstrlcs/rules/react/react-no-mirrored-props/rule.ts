import type { Identifier } from "../shared/nodes.ts";
import type { Context, Definition, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { isFunctionNode, memberName, unwrap } from "../shared/nodes.ts";
import { reactExportName } from "../shared/origin.ts";
import { reactMajorVersion } from "../shared/project.ts";
import { definitionOf } from "../shared/scope.ts";

type Node = ESTree.Node;

const SEED_NAME = /^(?:initial|default)[A-Z]/v;
const BRANCHING_TYPES = new Set(["ConditionalExpression", "LogicalExpression"]);
const QUERY_HOOKS = new Set(["useInfiniteQuery", "useQuery", "useSuspenseQuery"]);

const INITIAL_ARGUMENTS = new Map([
  ["useReducer", 1],
  ["useState", 0],
]);

function lazyValue(node: Node) {
  if (!isFunctionNode(node) || node.params.length > 0 || node.body === null) {
    return node;
  }

  const { body } = node;

  if (body.type !== "BlockStatement") {
    return body;
  }

  const [statement] = body.body;

  if (body.body.length !== 1 || statement?.type !== "ReturnStatement" || !statement.argument) {
    return node;
  }

  return statement.argument;
}

function branchesOf(node: Node) {
  const queue = [unwrap(node)];

  for (const value of queue) {
    if (value.type === "LogicalExpression") {
      queue.push(unwrap(value.left), unwrap(value.right));
    }

    if (value.type === "ConditionalExpression") {
      queue.push(unwrap(value.consequent), unwrap(value.alternate));
    }
  }

  return queue.filter((value) => !BRANCHING_TYPES.has(value.type));
}

function rootOf(node: Node) {
  let root = unwrap(node);
  let member: string | undefined;

  while (root.type === "MemberExpression") {
    member = memberName(root);
    root = unwrap(root.object);
  }

  return { member, root };
}

function contains(outer: Node, inner: Node) {
  return outer.range[0] <= inner.range[0] && inner.range[1] <= outer.range[1];
}

function patternKey(pattern: Node, binding: Identifier) {
  const property =
    pattern.type === "ObjectPattern"
      ? pattern.properties.find((entry) => contains(entry, binding))
      : undefined;

  if (property?.type !== "Property" || property.computed || property.key.type !== "Identifier") {
    return;
  }

  return property.key.name;
}

function propsPattern({ name, node, type }: Definition) {
  const [first] = type === "Parameter" && isFunctionNode(node) ? node.params : [];
  const pattern = first?.type === "AssignmentPattern" ? first.left : first;

  if (pattern === undefined || !contains(pattern, name)) {
    return;
  }

  return pattern;
}

function isQueryCall(context: Context, { callee }: ESTree.CallExpression) {
  const target = unwrap(callee);
  const definition = target.type === "Identifier" ? definitionOf(context, target) : undefined;
  const { node, parent } = definition ?? {};

  return (
    parent?.type === "ImportDeclaration" &&
    parent.source.value === "@tanstack/react-query" &&
    node?.type === "ImportSpecifier" &&
    node.imported.type === "Identifier" &&
    QUERY_HOOKS.has(node.imported.name)
  );
}

function callSource(context: Context, node: Node) {
  const call = unwrap(node);

  if (call.type !== "CallExpression") {
    return;
  }

  if (isQueryCall(context, call)) {
    return { messageId: "query" as const };
  }

  return reactExportName(context, call.callee) === "use"
    ? { messageId: "use" as const }
    : undefined;
}

function propSource(name: string | undefined) {
  if (name === undefined || SEED_NAME.test(name)) {
    return;
  }

  return { messageId: "mirroredProp" as const, name };
}

function declaredSource(context: Context, definition: Definition) {
  const declarator = definition.node.type === "VariableDeclarator" ? definition.node : undefined;
  const init = declarator?.init && unwrap(declarator.init);

  if (declarator === undefined || init === null || init === undefined) {
    return;
  }

  if (init.type !== "Identifier") {
    return callSource(context, init);
  }

  const props = definitionOf(context, init);

  if (props === undefined || propsPattern(props)?.type !== "Identifier") {
    return;
  }

  return propSource(patternKey(declarator.id, definition.name));
}

function sourceOf(context: Context, node: Node) {
  const { member, root } = rootOf(node);
  const definition = root.type === "Identifier" ? definitionOf(context, root) : undefined;

  if (definition === undefined) {
    return callSource(context, root);
  }

  const pattern = propsPattern(definition);

  if (pattern === undefined) {
    return declaredSource(context, definition);
  }

  return propSource(pattern.type === "Identifier" ? member : patternKey(pattern, definition.name));
}

function checkInitialValue(context: Context, initial: Node) {
  const { node, source } =
    branchesOf(lazyValue(unwrap(initial)))
      .map((branch) => ({ node: branch, source: sourceOf(context, branch) }))
      .find((branch) => branch.source !== undefined) ?? {};

  if (node === undefined || source === undefined) {
    return;
  }

  const name = "name" in source ? source.name : context.sourceCode.getText(node);
  const seed = `initial${name.charAt(0).toUpperCase()}${name.slice(1)}`;

  context.report({ data: { name, seed }, messageId: source.messageId, node });
}

export const reactNoMirroredProps = defineRule({
  meta: {
    docs: {
      description:
        "Forbid copying props, TanStack Query results and values read with use into React state.",
    },
    messages: {
      mirroredProp:
        '"{{name}}" is a prop copied into state, so the state ignores later values from the parent. Derive the value from the prop during render, or rename the prop {{seed}} if it only seeds the state.',
      query:
        '"{{name}}" comes from a TanStack Query result, and copying it into state opts out of its background updates. Read it from the query during render, and keep only local edits in state.',
      use: '"{{name}}" is read with use, and copying it into state keeps the first value after the promise changes. Derive the value from it during render instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    return {
      before() {
        return reactMajorVersion(context.filename) !== undefined;
      },
      CallExpression(node) {
        const index = INITIAL_ARGUMENTS.get(reactExportName(context, node.callee) ?? "");
        const initial = index === undefined ? undefined : node.arguments[index];

        if (initial === undefined || initial.type === "SpreadElement") {
          return;
        }

        checkInitialValue(context, initial);
      },
    };
  },
});
