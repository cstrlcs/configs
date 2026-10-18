import type { FunctionNode } from "../shared/nodes.ts";
import type { Context, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { calleeName, isFunctionNode, isWrapper } from "../shared/nodes.ts";
import { reactExportName } from "../shared/origin.ts";
import { reactMajorVersion } from "../shared/project.ts";

type VisitorKeys = Context["sourceCode"]["visitorKeys"];

const HOOK_NAME = /^use(?:[A-Z0-9]|$)/v;
const HOOKS_WITHOUT_CALLS = new Set(["use", "useMDXComponents"]);
const PASS_THROUGH_TYPES = new Set(["AwaitExpression", "LogicalExpression", "ObjectExpression"]);

const NAMING_CONVENTIONS = new Map([
  ["createContext", { expected: /Context$/v, messageId: "contextName" }],
  ["useId", { expected: /(?:^id|Id)$/v, messageId: "idName" }],
  ["useRef", { expected: /(?:^ref|Ref)$/v, messageId: "refName" }],
]);

function staticName(key: ESTree.Node, computed: boolean) {
  if (key.type === "Literal") {
    return typeof key.value === "string" ? key.value : undefined;
  }

  return !computed && key.type === "Identifier" ? key.name : undefined;
}

function carriesValue(holder: ESTree.Node, value: ESTree.Node) {
  if (holder.type === "ConditionalExpression") {
    return holder.test !== value;
  }

  if (holder.type === "SequenceExpression") {
    return holder.expressions.at(-1) === value;
  }

  if (holder.type === "Property") {
    return holder.value === value && staticName(holder.key, holder.computed) !== undefined;
  }

  return isWrapper(holder) || PASS_THROUGH_TYPES.has(holder.type);
}

function assignedName(left: ESTree.Node) {
  if (left.type === "Identifier") {
    return { name: left.name, node: left };
  }

  const name =
    left.type === "MemberExpression" ? staticName(left.property, left.computed) : undefined;

  return name === undefined ? undefined : { name, node: left };
}

function ownerOf(holder: ESTree.Node, value: ESTree.Node) {
  if (holder.type === "VariableDeclarator") {
    return holder.id.type === "Identifier" ? { name: holder.id.name, node: holder.id } : undefined;
  }

  if (holder.type === "AssignmentExpression") {
    return assignedName(holder.left);
  }

  if (
    (holder.type !== "MethodDefinition" && holder.type !== "PropertyDefinition") ||
    holder.value !== value
  ) {
    return;
  }

  const name = staticName(holder.key, holder.computed);

  return name === undefined ? undefined : { name, node: holder.key };
}

function valueChain(start: ESTree.Node) {
  const chain = [start];
  let last = start;

  while (last.parent !== null && carriesValue(last.parent, last)) {
    last = last.parent;
    chain.push(last);
  }

  return chain;
}

function landingOf(start: ESTree.Node) {
  const chain = valueChain(start);
  const outermost = chain.at(-1) ?? start;
  const owner = outermost.parent === null ? undefined : ownerOf(outermost.parent, outermost);
  const property = chain.find((link) => link.type === "Property");

  if (owner === undefined || property?.type !== "Property") {
    return owner;
  }

  return { name: staticName(property.key, property.computed) ?? owner.name, node: property.key };
}

function hookLanding(node: FunctionNode) {
  const landing = node.id === null ? landingOf(node) : { name: node.id.name, node: node.id };

  return landing !== undefined && HOOK_NAME.test(landing.name) ? landing : undefined;
}

function isNode(item: unknown): item is ESTree.Node {
  return typeof item === "object" && item !== null && "type" in item;
}

function childNodes(keys: VisitorKeys, node: ESTree.Node) {
  return (keys[node.type] ?? []).flatMap((key) => {
    const value: unknown = Reflect.get(node, key);
    const items: unknown[] = Array.isArray(value) ? value : [value];

    return items.filter((item) => isNode(item));
  });
}

function isHookCall(node: ESTree.Node) {
  if (node.type === "CallExpression") {
    return HOOK_NAME.test(calleeName(node.callee) ?? "");
  }

  return node.type === "TaggedTemplateExpression" && HOOK_NAME.test(calleeName(node.tag) ?? "");
}

function callsHook(keys: VisitorKeys, root: FunctionNode) {
  const queue = childNodes(keys, root);

  for (const node of queue) {
    if (isHookCall(node)) {
      return true;
    }

    if (!isFunctionNode(node) || hookLanding(node) === undefined) {
      queue.push(...childNodes(keys, node));
    }
  }

  return false;
}

function isMockRegistration(callee: ESTree.Node) {
  if (
    callee.type !== "MemberExpression" ||
    callee.computed ||
    callee.object.type !== "Identifier"
  ) {
    return false;
  }

  const { object, property } = callee;

  return property.name === "mock" || `${object.name}.${property.name}` === "mock.module";
}

function isMockFactory(node: FunctionNode) {
  for (let child: ESTree.Node = node; child.parent !== null; child = child.parent) {
    const { parent } = child;

    if (
      parent.type === "CallExpression" &&
      isMockRegistration(parent.callee) &&
      parent.arguments.some((argument, index) => index > 0 && argument === child)
    ) {
      return true;
    }
  }

  return false;
}

function isEmptyFunction({ body }: FunctionNode) {
  return body === null || (body.type === "BlockStatement" && body.body.length === 0);
}

function checkHookName(context: Context, node: FunctionNode) {
  const landing = hookLanding(node);

  if (
    landing === undefined ||
    HOOKS_WITHOUT_CALLS.has(landing.name) ||
    isEmptyFunction(node) ||
    isMockFactory(node) ||
    callsHook(context.sourceCode.visitorKeys, node)
  ) {
    return;
  }

  context.report({ data: { name: landing.name }, messageId: "hookPrefix", node: landing.node });
}

function checkResultName(context: Context, node: ESTree.CallExpression) {
  const convention = NAMING_CONVENTIONS.get(reactExportName(context, node.callee) ?? "");
  const landing = convention === undefined ? undefined : landingOf(node);

  if (convention === undefined || landing === undefined || convention.expected.test(landing.name)) {
    return;
  }

  context.report({
    data: { name: landing.name },
    messageId: convention.messageId,
    node: landing.node,
  });
}

export const reactNaming = defineRule({
  meta: {
    docs: {
      description:
        "Require React names that say what they hold: Context, Ref and Id endings, and the use prefix only on functions that call hooks.",
    },
    messages: {
      contextName:
        '"{{name}}" holds a React context. End the name with Context, as in CartContext.',
      hookPrefix:
        '"{{name}}" is named like a hook but calls no hook. Drop the use prefix, or call a hook inside it.',
      idName:
        '"{{name}}" holds an id from useId. Call it id or end the name with Id, as in emailFieldId.',
      refName:
        '"{{name}}" holds a ref from useRef. Call it ref or end the name with Ref, as in drawerRef.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    function checkFunction(node: FunctionNode) {
      checkHookName(context, node);
    }

    return {
      ArrowFunctionExpression: checkFunction,
      before() {
        return reactMajorVersion(context.filename) !== undefined;
      },
      CallExpression(node) {
        checkResultName(context, node);
      },
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
    };
  },
});
