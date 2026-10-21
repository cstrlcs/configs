import type { FunctionNode, Identifier } from "../shared/nodes.ts";
import type { Context, Definition, ESTree, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { effectSetupOf } from "../shared/effects.ts";
import { isGlobalCall, isGlobalObject } from "../shared/globals.ts";
import { calleeName, isFunctionNode, memberName, unwrap } from "../shared/nodes.ts";
import { MAX_ALIAS_DEPTH } from "../shared/origin.ts";
import { reactMajorVersion } from "../shared/project.ts";
import { declaratorOf, definitionOf, variableOf } from "../shared/scope.ts";

type Node = ESTree.Node;
type Call = ESTree.CallExpression;

interface Observer {
  node: ESTree.NewExpression;
  phase: Node;
  target: Node;
}

interface Acquisition {
  messageId: string;
  unreleased: (state: Tracker) => Node[];
}

type Tracker = ReturnType<typeof emptyTracker>;

const RESOURCES = new Map([
  ["addEventListener", { messageId: "eventListener", release: "removeEventListener" }],
  ["IntersectionObserver", { messageId: "intersectionObserver", release: "disconnect" }],
  ["ResizeObserver", { messageId: "resizeObserver", release: "disconnect" }],
  ["setInterval", { messageId: "interval", release: "clearInterval" }],
  ["setTimeout", { messageId: "timeout", release: "clearTimeout" }],
]);

const releaseMethods = new Set([
  ...[...RESOURCES.values()].map(({ release }) => release),
  "abort",
  "observe",
  "unobserve",
]);

const OBSERVERS = new Set(["IntersectionObserver", "ResizeObserver"]);
const BINDING_SITES = new Set(["AssignmentExpression", "BlockStatement", "VariableDeclarator"]);

const SHAPE_TYPES = new Set([
  "CallExpression",
  "Identifier",
  "Literal",
  "MemberExpression",
  "TemplateLiteral",
  "ThisExpression",
]);

const DYNAMIC_TYPES = new Set([
  "CallExpression",
  "ConditionalExpression",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "IfStatement",
  "LogicalExpression",
  "SwitchStatement",
  "WhileStatement",
]);

function emptyTracker() {
  return {
    acquisitions: Array.of<Acquisition>(),
    cleanup: new Set<Node>(),
    functionCalls: Array.of<{ node: Call; target: FunctionNode }>(),
    methodCalls: Array.of<Call>(),
    setup: new Set<Node>(),
  };
}

function findAncestor(node: Node, matches: (ancestor: Node) => boolean) {
  let current = node.parent;

  while (current !== null && !matches(current)) {
    current = current.parent;
  }

  return current ?? undefined;
}

function receiverOf({ callee }: Call) {
  const target = unwrap(callee);

  return target.type === "MemberExpression" ? target.object : undefined;
}

function valueOf(context: Context, identifier: Identifier) {
  const definition = definitionOf(context, identifier);
  const declarator = declaratorOf(context, identifier);

  if (definition?.type === "FunctionName") {
    return definition.node;
  }

  return declarator?.id.type === "Identifier" ? (declarator.init ?? undefined) : undefined;
}

function propertyName({ computed, key }: ESTree.ObjectProperty) {
  const name = key.type === "Identifier" ? key.name : key.type === "Literal" && key.value;

  return !computed && typeof name === "string" ? name : undefined;
}

function findProperty(object: ESTree.ObjectExpression | undefined, name: string) {
  return object?.properties.find(
    (property): property is ESTree.ObjectProperty =>
      property.type === "Property" && propertyName(property) === name,
  )?.value;
}

function objectOf(context: Context, node: Node | undefined) {
  const target = node && unwrap(node);
  const value = target?.type === "Identifier" ? valueOf(context, target) : target;
  const object = value && unwrap(value);

  return object?.type === "ObjectExpression" ? object : undefined;
}

function resolve(context: Context, node: Node) {
  const target = unwrap(node);
  const name = memberName(target);
  const value = target.type === "Identifier" ? valueOf(context, target) : target;

  const resolved =
    name !== undefined && target.type === "MemberExpression"
      ? findProperty(objectOf(context, target.object), name)
      : value;

  return resolved && unwrap(resolved);
}

function shapeOf(context: Context, node: Node) {
  const target = unwrap(node);

  return SHAPE_TYPES.has(target.type)
    ? context.sourceCode.getText(target).replaceAll(/\s/gv, "")
    : undefined;
}

function isSameShape(context: Context, first: Node, second: Node) {
  const shape = shapeOf(context, first);

  return shape !== undefined && shape === shapeOf(context, second);
}

function callbackIteration(definition: Definition | undefined, name: string) {
  const callback = definition?.type === "Parameter" ? definition.node : undefined;

  if (!isFunctionNode(callback) || callback.parent.type !== "CallExpression") {
    return;
  }

  const index = callback.params.findIndex(
    (parameter) => parameter.type === "Identifier" && parameter.name === name,
  );

  return index === -1 ? undefined : { index: String(index), source: callback.parent.callee };
}

function iterationOf({ defs: [definition], name }: Variable) {
  const loop = definition?.parent?.parent;

  return loop?.type === "ForOfStatement"
    ? { index: loop.left.type, source: loop.right }
    : callbackIteration(definition, name);
}

function isSameIteration(context: Context, first: Variable, second: Variable) {
  const iteration = iterationOf(first);
  const otherIteration = iterationOf(second);

  return (
    iteration !== undefined &&
    iteration.index === otherIteration?.index &&
    isSameShape(context, iteration.source, otherIteration.source)
  );
}

function isSameBinding(context: Context, one: Identifier, other: Identifier) {
  const first = variableOf(context, one);
  const second = variableOf(context, other);

  if (first === undefined || second === undefined) {
    return first === second && one.name === other.name;
  }

  return first === second || isSameIteration(context, first, second);
}

function constantInit(context: Context, node: Node) {
  const declarator = node.type === "Identifier" ? declaratorOf(context, node) : undefined;
  const declaration = declarator?.parent;

  return declaration?.type === "VariableDeclaration" && declaration.kind === "const"
    ? declarator?.init
    : undefined;
}

function literalValue(context: Context, node: Node) {
  const value = unwrap(constantInit(context, node) ?? node);

  return value.type === "Literal" ? value.value : undefined;
}

function isSameLeaf(context: Context, one: Node, other: Node) {
  const literal = literalValue(context, one);

  if (literal !== undefined) {
    return literal === literalValue(context, other);
  }

  return one.type === "Identifier" && other.type === "Identifier"
    ? isSameBinding(context, one, other)
    : one === other || isSameShape(context, one, other);
}

function isSame(context: Context, first: Node, second: Node) {
  let one = unwrap(first);
  let other = unwrap(second);

  while (one.type === "MemberExpression" && other.type === "MemberExpression") {
    const isSameProperty = one.computed
      ? other.computed && isSameLeaf(context, unwrap(one.property), unwrap(other.property))
      : !other.computed && isSameShape(context, one.property, other.property);

    if (!isSameProperty) {
      return false;
    }

    one = unwrap(one.object);
    other = unwrap(other.object);
  }

  return isSameLeaf(context, one, other);
}

function assignmentTarget(node: Node) {
  const declaration = findAncestor(node, (ancestor) => BINDING_SITES.has(ancestor.type));

  if (declaration?.type === "VariableDeclarator") {
    return declaration.id;
  }

  return declaration?.type === "AssignmentExpression" ? declaration.left : undefined;
}

function controllerOf(context: Context, object: Node) {
  const root = unwrap(object);

  const isParameter =
    root.type === "Identifier" && definitionOf(context, root)?.type === "Parameter";

  return isParameter ? "external" : object;
}

function signalBinding(
  context: Context,
  signal: Identifier,
  declarator?: ESTree.VariableDeclarator,
) {
  const init = declarator?.id.type === "ObjectPattern" ? declarator.init : undefined;

  if (definitionOf(context, signal)?.type === "Parameter") {
    return "external";
  }

  return init && unwrap(init).type !== "NewExpression" ? controllerOf(context, init) : undefined;
}

function signalSource(context: Context, node: Node) {
  let signal = unwrap(node);

  for (let depth = 0; signal.type === "Identifier" && depth < MAX_ALIAS_DEPTH; depth += 1) {
    const declarator = declaratorOf(context, signal);

    if (declarator?.id.type !== "Identifier") {
      return signalBinding(context, signal, declarator);
    }

    if (!declarator.init) {
      return;
    }

    signal = unwrap(declarator.init);
  }

  return signal.type === "MemberExpression" ? controllerOf(context, signal.object) : undefined;
}

function captureOf(context: Context, options: Node | undefined) {
  const object = objectOf(context, options);
  const capture = object ? findProperty(object, "capture") : options;
  const value = capture && resolve(context, capture);

  return value?.type === "Literal" && Boolean(value.value);
}

function isFromReactNative(context: Context, node: Call) {
  const receiver = receiverOf(node);
  const target = receiver && unwrap(receiver);
  const definition = target?.type === "Identifier" ? definitionOf(context, target) : undefined;

  return (
    definition?.parent?.type === "ImportDeclaration" &&
    definition.parent.source.value.startsWith("react-native")
  );
}

function isInCleanup(state: Tracker, node: Node) {
  return findAncestor(node, (ancestor) => state.cleanup.has(ancestor)) !== undefined;
}

function isReleased(state: Tracker, method: string, matches: (release: Call) => boolean) {
  return state.methodCalls.some(
    (release) =>
      calleeName(release.callee) === method && isInCleanup(state, release) && matches(release),
  );
}

function isSignalAborted(context: Context, state: Tracker, signal: Node | undefined) {
  const source = signal && signalSource(context, signal);

  if (source === undefined || source === "external") {
    return source === "external";
  }

  return isReleased(state, "abort", (release) => {
    const receiver = receiverOf(release);

    return receiver !== undefined && isSame(context, source, receiver);
  });
}

function isSameReceiver(context: Context, first: Call, second: Call) {
  const one = receiverOf(first);
  const other = receiverOf(second);

  if (one !== undefined && other !== undefined) {
    return isSame(context, one, other);
  }

  return (one ?? other) === undefined || isGlobalObject(context, one ?? other);
}

function isRemoved(context: Context, state: Tracker, node: Call) {
  return isReleased(state, "removeEventListener", (removal) => {
    const isSameArguments = [0, 1].every((index) => {
      const added = node.arguments[index];
      const removed = removal.arguments[index];

      return added !== undefined && removed !== undefined && isSame(context, added, removed);
    });

    return (
      isSameArguments &&
      isSameReceiver(context, node, removal) &&
      captureOf(context, node.arguments[2]) === captureOf(context, removal.arguments[2])
    );
  });
}

function observerLeaks(context: Context, state: Tracker, { node, phase, target }: Observer) {
  function isSameObserver(call: Call) {
    const receiver = receiverOf(call);

    return (
      receiver !== undefined &&
      findAncestor(call, (ancestor) => ancestor === node) === undefined &&
      isSame(context, receiver, target)
    );
  }

  const observes = state.methodCalls.filter(
    (call) => calleeName(call.callee) === "observe" && isSameObserver(call),
  );

  if (observes.length === 0 || isReleased(state, "disconnect", isSameObserver)) {
    return [];
  }

  const isDynamic = observes.some(
    (call) =>
      findAncestor(call, (ancestor) => ancestor === phase || DYNAMIC_TYPES.has(ancestor.type)) !==
      phase,
  );

  if (isDynamic) {
    return [node];
  }

  return observes.filter(({ arguments: [element] }) => {
    const isUnobserved = isReleased(state, "unobserve", (release) => {
      const [released] = release.arguments;

      return isSameObserver(release) && isSame(context, released ?? release, element ?? release);
    });

    return element === undefined || !isUnobserved;
  });
}

function visitTimer(context: Context, state: Tracker, node: Call) {
  const resource = RESOURCES.get(calleeName(node.callee) ?? "");
  const target = assignmentTarget(node);

  if (resource === undefined || !isGlobalCall(context, node)) {
    return;
  }

  function isClearing({ arguments: [id] }: Call) {
    return target !== undefined && id !== undefined && isSame(context, target, id);
  }

  state.acquisitions.push({
    messageId: resource.messageId,
    unreleased: (current) => (isReleased(current, resource.release, isClearing) ? [] : [node]),
  });
}

function visitListener(context: Context, state: Tracker, node: Call) {
  const [type, handler, options] = node.arguments;
  const signal = findProperty(objectOf(context, options), "signal");

  if (type === undefined || handler === undefined || isFromReactNative(context, node)) {
    return;
  }

  state.acquisitions.push({
    messageId: "eventListener",
    unreleased: (current) =>
      isSignalAborted(context, current, signal) || isRemoved(context, current, node) ? [] : [node],
  });
}

const visitors = new Map([
  ["addEventListener", visitListener],
  ["setInterval", visitTimer],
  ["setTimeout", visitTimer],
]);

function visitEffect(context: Context, state: Tracker, node: Call) {
  const root = effectSetupOf(context, node);

  if (root === undefined) {
    return;
  }

  const body = root.type === "ArrowFunctionExpression" ? unwrap(root.body) : undefined;

  state.setup.add(root);

  if (isFunctionNode(body)) {
    state.cleanup.add(body);
  }
}

function visitCall(context: Context, state: Tracker, node: Call) {
  const callee = resolve(context, node.callee);
  const name = calleeName(node.callee) ?? "";

  visitEffect(context, state, node);

  if (isFunctionNode(callee)) {
    state.functionCalls.push({ node, target: callee });
  }

  if (releaseMethods.has(name)) {
    state.methodCalls.push(node);
  }

  if (findAncestor(node, (ancestor) => state.setup.has(ancestor) || state.cleanup.has(ancestor))) {
    visitors.get(name)?.(context, state, node);
  }
}

function visitReturn(context: Context, state: Tracker, node: ESTree.ReturnStatement) {
  const setup = findAncestor(node, isFunctionNode);
  const argument = node.argument && unwrap(node.argument);

  if (!argument || setup === undefined || !state.setup.has(setup)) {
    return;
  }

  const cleanup = argument.type === "Identifier" ? valueOf(context, argument) : argument;

  if (cleanup !== undefined) {
    state.cleanup.add(unwrap(cleanup));
  }
}

function visitNew(context: Context, state: Tracker, node: ESTree.NewExpression) {
  const callee = unwrap(node.callee);
  const name = callee.type === "Identifier" ? callee.name : "";
  const target = assignmentTarget(node);

  const phase = findAncestor(
    node,
    (ancestor) =>
      isFunctionNode(ancestor) && (state.setup.has(ancestor) || state.cleanup.has(ancestor)),
  );

  if (!OBSERVERS.has(name) || phase === undefined) {
    return;
  }

  state.acquisitions.push({
    messageId: RESOURCES.get(name)?.messageId ?? "",
    unreleased: (current) =>
      target ? observerLeaks(context, current, { node, phase, target }) : [node],
  });
}

function extendThroughCalls(state: Tracker, reached: Set<Node>, reaches: (node: Call) => boolean) {
  let size = -1;

  while (size !== reached.size) {
    ({ size } = reached);

    for (const { node, target } of state.functionCalls) {
      if (reaches(node)) {
        reached.add(target);
      }
    }
  }
}

function reportLeaks(context: Context, state: Tracker) {
  extendThroughCalls(state, state.cleanup, (node) => isInCleanup(state, node));

  for (const { messageId, unreleased } of state.acquisitions) {
    for (const node of unreleased(state)) {
      context.report({ messageId, node });
    }
  }
}

export const reactNoLeakedEffects = defineRule({
  meta: {
    docs: {
      description:
        "Require every listener, timer and observer that a React effect starts to be released in its cleanup.",
    },
    messages: {
      eventListener:
        '"addEventListener" here is never undone. Call removeEventListener with the same arguments in the effect cleanup, or abort its signal there.',
      intersectionObserver:
        '"IntersectionObserver" here is never disconnected. Call its disconnect method in the effect cleanup.',
      interval:
        '"setInterval" here is never cleared. Pass its id to clearInterval in the effect cleanup.',
      resizeObserver:
        '"ResizeObserver" here is never disconnected. Call its disconnect method in the effect cleanup.',
      timeout:
        '"setTimeout" here is never cleared. Pass its id to clearTimeout in the effect cleanup.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    let state = emptyTracker();

    return {
      before() {
        state = emptyTracker();

        return (
          context.sourceCode.text.includes("Effect") &&
          reactMajorVersion(context.filename) !== undefined
        );
      },
      CallExpression(node) {
        visitCall(context, state, node);
      },
      NewExpression(node) {
        visitNew(context, state, node);
      },
      "Program:exit"() {
        reportLeaks(context, state);
      },
      ReturnStatement(node) {
        visitReturn(context, state, node);
      },
    };
  },
});
