import type { VisitorKeys } from "../shared/ast.ts";
import type { FunctionNode } from "../shared/functions.ts";
import type { Context, ESTree, Reference, Scope, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { children, contains } from "../shared/ast.ts";
import { isPlainLiteral } from "../shared/constants.ts";

interface FunctionFacts {
  effectArms: Set<ESTree.Node>;
  hasWork: boolean;
  returnArms: Set<ESTree.Node>;
  returns: ESTree.ReturnStatement[];
  throws: ESTree.ThrowStatement[];
}

interface Visit {
  arm: ESTree.Node | undefined;
  node: ESTree.Node;
}

const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const LOOP_TYPES = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "WhileStatement",
]);

const EFFECT_TYPES = new Set([
  "AssignmentExpression",
  "AwaitExpression",
  "CallExpression",
  "ChainExpression",
  "UpdateExpression",
]);

const WORK_TYPES = new Set([
  "AwaitExpression",
  "CallExpression",
  "ChainExpression",
  "NewExpression",
]);

const EVALUATED_OPERATORS = new Set(["!", "+", "-", "typeof"]);
const CALL_TYPES = new Set(["CallExpression", "NewExpression", "TaggedTemplateExpression"]);
const notConstant = Symbol("not constant");

function exitChildren(node: ESTree.Node) {
  if (node.type === "BlockStatement") {
    return node.body;
  }

  if (node.type === "IfStatement") {
    return [node.consequent, node.alternate];
  }

  if (node.type === "TryStatement") {
    return [node.block, node.handler?.body ?? null, node.finalizer];
  }

  return node.type === "SwitchStatement"
    ? node.cases.slice(-1).flatMap(({ consequent }) => consequent)
    : [];
}

function switchExits(
  keys: VisitorKeys,
  node: ESTree.SwitchStatement,
  results: Map<unknown, boolean>,
) {
  const last = node.cases.at(-1)?.consequent ?? [];

  return (
    node.cases.some((option) => option.test === null) &&
    last.some((child) => results.get(child) === true) &&
    !contains(keys, node, (child) => child.type === "BreakStatement")
  );
}

function tryExits(node: ESTree.TryStatement, results: Map<unknown, boolean>) {
  const { block, finalizer, handler } = node;
  const isHandled = handler === null || results.get(handler.body) === true;

  return results.get(finalizer) === true || (results.get(block) === true && isHandled);
}

function exitsAfterChildren(keys: VisitorKeys, node: ESTree.Node, results: Map<unknown, boolean>) {
  if (node.type === "BlockStatement") {
    return node.body.some((child) => results.get(child) === true);
  }

  if (node.type === "IfStatement") {
    return results.get(node.consequent) === true && results.get(node.alternate) === true;
  }

  if (node.type === "TryStatement") {
    return tryExits(node, results);
  }

  if (node.type === "SwitchStatement") {
    return switchExits(keys, node, results);
  }

  return node.type === "ReturnStatement" || node.type === "ThrowStatement";
}

function alwaysExits(keys: VisitorKeys, root: ESTree.Node) {
  const order = [root];
  const results = new Map<unknown, boolean>();

  for (const node of order) {
    order.push(...exitChildren(node).filter((child) => child !== null));
  }

  for (const node of order.toReversed()) {
    results.set(node, exitsAfterChildren(keys, node, results));
  }

  return results.get(root) === true;
}

function isArm(parent: ESTree.Node, child: ESTree.Node) {
  if (child.type === "SwitchCase") {
    return true;
  }

  if (parent.type === "IfStatement") {
    return child === parent.consequent || child === parent.alternate;
  }

  return LOOP_TYPES.has(parent.type) && Reflect.get(parent, "body") === child;
}

function isWork(expression: ESTree.Expression) {
  if (expression.type === "AssignmentExpression") {
    return expression.left.type === "MemberExpression";
  }

  if (expression.type === "UpdateExpression") {
    return expression.argument.type === "MemberExpression";
  }

  return WORK_TYPES.has(expression.type);
}

function recordExit(facts: FunctionFacts, node: ESTree.Node) {
  if (node.type === "ReturnStatement") {
    facts.returns.push(node);
  }

  if (node.type === "ThrowStatement") {
    facts.throws.push(node);
  }
}

function recordArm(facts: FunctionFacts, { arm, node }: Visit) {
  if (arm === undefined) {
    facts.hasWork ||= node.type === "ExpressionStatement" && isWork(node.expression);

    return;
  }

  if (node.type === "ReturnStatement") {
    facts.returnArms.add(arm);
  }

  if (node.type === "ExpressionStatement" && EFFECT_TYPES.has(node.expression.type)) {
    facts.effectArms.add(arm);
  }
}

function collectFacts(keys: VisitorKeys, body: ESTree.BlockStatement) {
  const facts: FunctionFacts = {
    effectArms: new Set(),
    hasWork: false,
    returnArms: new Set(),
    returns: [],
    throws: [],
  };

  const pending: Visit[] = body.body.map((node) => ({ arm: undefined, node }));

  for (const visit of pending) {
    recordExit(facts, visit.node);
    recordArm(facts, visit);

    for (const child of children(keys, visit.node)) {
      if (!FUNCTION_TYPES.has(child.type)) {
        pending.push({ arm: isArm(visit.node, child) ? child : visit.arm, node: child });
      }
    }
  }

  return facts;
}

function isCaught(statement: ESTree.ThrowStatement) {
  let child: ESTree.Node = statement;

  for (
    let current: ESTree.Node | null = statement.parent;
    current !== null && !FUNCTION_TYPES.has(current.type);
    current = current.parent
  ) {
    if (current.type === "TryStatement" && current.handler !== null && current.block === child) {
      return true;
    }

    child = current;
  }

  return false;
}

function isMemberTarget(current: ESTree.Node, child: ESTree.Node) {
  if (child.type !== "MemberExpression") {
    return false;
  }

  if (current.type === "AssignmentExpression") {
    return current.left === child;
  }

  if (current.type === "UpdateExpression") {
    return current.argument === child;
  }

  return current.type === "UnaryExpression" && current.operator === "delete";
}

function mayMutate({ identifier }: Reference, node: FunctionNode) {
  let child: ESTree.Node = identifier;

  for (
    let current: ESTree.Node | null = identifier.parent;
    current !== null && current !== node;
    current = current.parent
  ) {
    if (CALL_TYPES.has(current.type) || isMemberTarget(current, child)) {
      return true;
    }

    child = current;
  }

  return false;
}

function isInitialWrite(reference: Reference, node: FunctionNode) {
  const { parent } = reference.identifier;

  if (parent.type === "AssignmentPattern") {
    return parent.parent === node;
  }

  const isTopLevel =
    parent.type === "AssignmentExpression" &&
    parent.parent.type === "ExpressionStatement" &&
    parent.parent.parent === node.body;

  return reference.init || isTopLevel;
}

function isStable(variable: Variable, node: FunctionNode) {
  const { defs, references } = variable;
  const writes = references.filter((reference) => reference.isWrite());
  const [write] = writes;

  const isFirstWrite =
    write === undefined || (write === references[0] && isInitialWrite(write, node));

  return (
    defs.length === 1 &&
    writes.length <= 1 &&
    isFirstWrite &&
    !references.some((reference) => !reference.isWrite() && mayMutate(reference, node))
  );
}

function stableVariable(scope: Scope, node: FunctionNode, expression: ESTree.Expression) {
  const variable = expression.type === "Identifier" ? scope.set.get(expression.name) : undefined;
  const isReturned = variable?.references.some(({ identifier }) => identifier === expression);

  if (variable === undefined || isReturned !== true || !isStable(variable, node)) {
    return;
  }

  return variable;
}

function evaluateUnary(operator: string, value: unknown) {
  const isTruthy = Boolean(value);

  if (operator === "!") {
    return !isTruthy;
  }

  if (operator === "typeof") {
    return typeof value;
  }

  if (operator === "-") {
    return -Number(value);
  }

  return Number(value);
}

function constantValue(expression: ESTree.Expression | null) {
  const operators: string[] = [];
  let current = expression;

  while (current?.type === "UnaryExpression") {
    operators.unshift(current.operator);
    current = current.argument;
  }

  if (
    !isPlainLiteral(current) ||
    !operators.every((operator) => EVALUATED_OPERATORS.has(operator))
  ) {
    return notConstant;
  }

  let value: unknown = current.value;

  for (const operator of operators) {
    value = evaluateUnary(operator, value);
  }

  return value;
}

function returnedValue(scope: Scope, node: FunctionNode, expression: ESTree.Expression) {
  const variable = stableVariable(scope, node, expression);
  const [definition] = variable?.defs ?? [];
  const writes = variable?.references.filter((reference) => reference.isWrite()) ?? [];

  if (
    definition?.node.type === "VariableDeclarator" &&
    writes.every((reference) => reference.init)
  ) {
    return constantValue(definition.node.init);
  }

  return constantValue(expression);
}

function looksIntentional(facts: FunctionFacts, isConstant: boolean) {
  const { effectArms, hasWork, returnArms } = facts;

  if (hasWork) {
    return true;
  }

  if (isConstant) {
    return returnArms.size > 0 && returnArms.isSubsetOf(effectArms);
  }

  return !effectArms.isSubsetOf(returnArms);
}

function returnsSameVariable(variable: Variable | undefined, values: (ESTree.Expression | null)[]) {
  return (
    variable !== undefined &&
    values.every((value) => variable.references.some(({ identifier }) => identifier === value))
  );
}

function checkReturns(context: Context, node: FunctionNode, facts: FunctionFacts) {
  const scope = context.sourceCode.getScope(node);
  const [first, ...rest] = facts.returns.map((statement) => statement.argument);

  if (first === null || first === undefined) {
    return;
  }

  const value = returnedValue(scope, node, first);
  const isConstant = value !== notConstant;

  const isInvariant = isConstant
    ? rest.every((other) => other !== null && returnedValue(scope, node, other) === value)
    : returnsSameVariable(stableVariable(scope, node, first), rest);

  if (isInvariant && !looksIntentional(facts, isConstant)) {
    context.report({ messageId: "invariantReturn", node: node.id ?? node });
  }
}

function checkFunction(context: Context, node: FunctionNode) {
  const { visitorKeys } = context.sourceCode;
  const { body } = node;

  if (body?.type !== "BlockStatement" || node.generator || !alwaysExits(visitorKeys, body)) {
    return;
  }

  const facts = collectFacts(visitorKeys, body);

  if (facts.returns.length > 1 && facts.throws.every((statement) => isCaught(statement))) {
    checkReturns(context, node, facts);
  }
}

export const noInvariantReturns = defineRule({
  meta: {
    docs: {
      description: "Forbid functions that return the same value on every path.",
    },
    messages: {
      invariantReturn:
        "This function returns the same value on every path. Return something that varies, or return nothing.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      ArrowFunctionExpression(node) {
        checkFunction(context, node);
      },
      FunctionDeclaration(node) {
        checkFunction(context, node);
      },
      FunctionExpression(node) {
        checkFunction(context, node);
      },
    };
  },
});
