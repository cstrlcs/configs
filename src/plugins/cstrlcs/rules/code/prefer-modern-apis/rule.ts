import type { IdentifierNode } from "../shared/ast.ts";
import type { FunctionNode } from "../shared/functions.ts";
import type { Context, ESTree, Fixer } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { isPlainLiteral } from "../shared/constants.ts";
import { returnedBoolean } from "../shared/expressions.ts";
import { isFunctionExpression } from "../shared/functions.ts";
import { variableOf } from "../shared/scope.ts";

type Parts = (node: ESTree.Node) => readonly ESTree.Node[] | undefined;

interface UrlProbe {
  check: string;
  handler: ESTree.CatchClause;
  next: ESTree.Statement;
  node: ESTree.TryStatement;
  parse: ESTree.Statement;
}

const TIMERS = new Set(["setInterval", "setTimeout"]);
const TIMER_OWNERS = new Set(["globalThis", "window"]);
const NO_PARTS: readonly ESTree.Node[] = [];
const HOISTED_DEFINITIONS = new Set(["FunctionName", "ImportBinding"]);

const REFERENCE_INITIALIZERS = new Set([
  "ArrayExpression",
  "ArrowFunctionExpression",
  "ClassExpression",
  "FunctionExpression",
  "NewExpression",
  "ObjectExpression",
]);

function isGlobal(context: Context, identifier: IdentifierNode) {
  return (variableOf(context, identifier)?.defs.length ?? 0) === 0;
}

function isGlobalNamed(context: Context, node: ESTree.Node, name: string) {
  return node.type === "Identifier" && node.name === name && isGlobal(context, node);
}

function memberName(node: ESTree.Node) {
  if (node.type !== "MemberExpression" || node.computed || node.optional) {
    return;
  }

  return node.property.type === "Identifier" ? node.property.name : undefined;
}

function operandsOf(node: ESTree.Node) {
  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
    return node.left.type === "PrivateIdentifier" ? undefined : [node.left, node.right];
  }

  if (node.type === "ConditionalExpression") {
    return [node.test, node.consequent, node.alternate];
  }

  if (node.type === "UnaryExpression") {
    return node.operator === "delete" ? undefined : [node.argument];
  }

  return node.type === "TemplateLiteral" ? node.expressions : undefined;
}

function isBuiltFrom(root: ESTree.Node, leafParts: Parts) {
  const pending = [root];

  for (const node of pending) {
    const parts = operandsOf(node) ?? leafParts(node);

    if (parts === undefined) {
      return false;
    }

    pending.push(...parts);
  }

  return true;
}

function constantParts(node: ESTree.Node) {
  if ((node.type === "Identifier" && node.name !== "arguments") || isPlainLiteral(node)) {
    return NO_PARTS;
  }

  if (node.type !== "MemberExpression" || node.object.type === "Super") {
    return;
  }

  return node.computed ? [node.object, node.property] : [node.object];
}

function holdsReference(context: Context, node: ESTree.Node) {
  const variable = node.type === "Identifier" ? variableOf(context, node) : undefined;

  return (variable?.defs ?? []).some(
    ({ node: definition }) =>
      definition.type === "VariableDeclarator" &&
      REFERENCE_INITIALIZERS.has(definition.init?.type ?? ""),
  );
}

function singleReturn({ body }: ESTree.BlockStatement) {
  const [statement, ...rest] = body;

  return statement?.type === "ReturnStatement" && rest.length === 0
    ? (statement.argument ?? undefined)
    : undefined;
}

function returnedValue(fn: FunctionNode) {
  const { body } = fn;

  if (body === null || fn.async || fn.generator || fn.params.length > 0) {
    return;
  }

  if (body.type !== "BlockStatement") {
    return body;
  }

  return singleReturn(body);
}

function repeatedValue(context: Context, mapper: ESTree.Node | undefined) {
  const value = isFunctionExpression(mapper) ? returnedValue(mapper) : undefined;

  if (
    value === undefined ||
    isGlobalNamed(context, value, "undefined") ||
    holdsReference(context, value)
  ) {
    return;
  }

  return isBuiltFrom(value, constantParts) ? value : undefined;
}

function isLengthKey({ computed, key }: ESTree.ObjectProperty) {
  return !computed && key.type === "Identifier" && key.name === "length";
}

function lengthOf(node: ESTree.Node | undefined) {
  const [property, ...rest] = node?.type === "ObjectExpression" ? node.properties : [];

  if (property?.type !== "Property" || rest.length > 0) {
    return;
  }

  return isLengthKey(property) ? property.value : undefined;
}

function arrayFrom(context: Context, { arguments: values, callee }: ESTree.CallExpression) {
  const isFrom =
    callee.type === "MemberExpression" &&
    memberName(callee) === "from" &&
    isGlobalNamed(context, callee.object, "Array");

  const [source, mapper, ...rest] = isFrom ? values : [];
  const length = lengthOf(source);
  const value = repeatedValue(context, mapper);

  if (source === undefined || length === undefined || value === undefined || rest.length > 0) {
    return;
  }

  return { length, source, value };
}

function checkArrayFrom(context: Context, node: ESTree.CallExpression) {
  const found = arrayFrom(context, node);

  if (found === undefined) {
    return;
  }

  const { sourceCode } = context;
  const { length, source } = found;
  const value = sourceCode.getText(found.value);

  context.report({
    data: { length: sourceCode.getText(length), value },
    fix: (fixer) => fixer.replaceTextRange([source.range[1], node.range[1]], `).fill(${value})`),
    messageId: "arrayFill",
    node,
  });
}

function createdLength(context: Context, node: ESTree.Node) {
  const isCreation = node.type === "CallExpression" || node.type === "NewExpression";
  const isArray = isCreation && isGlobalNamed(context, node.callee, "Array");
  const [length, ...rest] = isArray ? node.arguments : [];

  if (length === undefined || rest.length > 0) {
    return;
  }

  return length.type === "SpreadElement" || length.type === "SequenceExpression"
    ? undefined
    : length;
}

function spreadLength(context: Context, node: ESTree.Node) {
  const [element, ...rest] = node.type === "ArrayExpression" ? node.elements : [];

  if (element?.type !== "SpreadElement" || rest.length > 0) {
    return;
  }

  return createdLength(context, element.argument);
}

function isArrayLength(node: ESTree.Node) {
  return (
    node.type === "Literal" &&
    typeof node.value === "number" &&
    Number.isInteger(node.value) &&
    node.value >= 0
  );
}

function checkSpreadMap(context: Context, node: ESTree.CallExpression) {
  const { arguments: values, callee } = node;
  const isMap = callee.type === "MemberExpression" && memberName(callee) === "map";
  const length = isMap ? spreadLength(context, callee.object) : undefined;
  const [mapper, ...rest] = values;
  const value = repeatedValue(context, mapper);

  if (length === undefined || value === undefined || rest.length > 0) {
    return;
  }

  const { sourceCode } = context;
  const data = { length: sourceCode.getText(length), value: sourceCode.getText(value) };
  const report = { data, messageId: "arrayFill", node } as const;

  if (!isArrayLength(length)) {
    context.report(report);

    return;
  }

  context.report({
    ...report,
    fix: (fixer) =>
      fixer.replaceText(node, `Array.from({ length: ${data.length} }).fill(${data.value})`),
  });
}

function timerOwner(callee: ESTree.Node) {
  if (callee.type !== "MemberExpression") {
    return callee;
  }

  const { object } = callee;

  return object.type === "Identifier" && TIMER_OWNERS.has(object.name) ? object : undefined;
}

function timerName(context: Context, callee: ESTree.Node) {
  const name = callee.type === "Identifier" ? callee.name : memberName(callee);
  const owner = timerOwner(callee);

  if (name === undefined || !TIMERS.has(name) || owner?.type !== "Identifier") {
    return;
  }

  return isGlobal(context, owner) ? name : undefined;
}

function timerArguments({ arguments: values }: ESTree.CallExpression) {
  const [scheduled, delay, ...extra] = values;

  if (scheduled === undefined || delay === undefined || extra.length > 0) {
    return;
  }

  if (scheduled.type === "SpreadElement" || delay.type === "SpreadElement") {
    return;
  }

  return { delay, scheduled };
}

function isSettled(context: Context, identifier: IdentifierNode, timer: ESTree.Node) {
  const variable = variableOf(context, identifier);

  if (variable === undefined || variable.defs.length === 0) {
    return false;
  }

  const isDeclaredBefore = variable.defs.every(
    ({ name, type }) => HOISTED_DEFINITIONS.has(type) || name.range[0] < timer.range[0],
  );

  const isNeverReassigned = variable.references.every(
    (reference) => !reference.isWrite() || reference.init,
  );

  return isDeclaredBefore && isNeverReassigned;
}

function eagerParts(context: Context, part: ESTree.Node, timer: ESTree.Node) {
  if (isPlainLiteral(part)) {
    return NO_PARTS;
  }

  return part.type === "Identifier" && isSettled(context, part, timer) ? NO_PARTS : undefined;
}

function isEagerCall(context: Context, call: ESTree.CallExpression, timer: ESTree.Node) {
  const { arguments: values, callee } = call;

  return (
    callee.type === "Identifier" &&
    isSettled(context, callee, timer) &&
    values.every((value) => isBuiltFrom(value, (part) => eagerParts(context, part, timer)))
  );
}

function arrowCall(scheduled: ESTree.Node) {
  const isPlainArrow =
    scheduled.type === "ArrowFunctionExpression" &&
    scheduled.expression &&
    scheduled.returnType == null;

  return isPlainArrow ? returnedValue(scheduled) : undefined;
}

function wrappedCall(context: Context, scheduled: ESTree.Node, timer: ESTree.Node) {
  const call = arrowCall(scheduled);

  if (call?.type !== "CallExpression" || call.optional || call.typeArguments != null) {
    return;
  }

  return isEagerCall(context, call, timer)
    ? { target: call.callee, values: call.arguments }
    : undefined;
}

function bindCall(scheduled: ESTree.Node) {
  if (scheduled.type !== "CallExpression" || scheduled.optional) {
    return;
  }

  const { arguments: values, callee } = scheduled;

  return callee.type === "MemberExpression" && memberName(callee) === "bind"
    ? { target: callee.object, values }
    : undefined;
}

function isUnbound(context: Context, thisValue: ESTree.Node | undefined) {
  if (thisValue?.type === "Literal") {
    return thisValue.value === null;
  }

  return thisValue !== undefined && isGlobalNamed(context, thisValue, "undefined");
}

function isPlainArgument(value: ESTree.Node) {
  if (value.type === "SpreadElement") {
    return value.argument.type === "Identifier";
  }

  return isBuiltFrom(value, constantParts);
}

function boundCall(context: Context, scheduled: ESTree.Node) {
  const bound = bindCall(scheduled);

  if (bound === undefined) {
    return;
  }

  const {
    target,
    values: [thisValue, ...values],
  } = bound;

  const isNamed = target.type === "Identifier" || target.type === "MemberExpression";

  if (!isNamed || !isUnbound(context, thisValue)) {
    return;
  }

  return values.every((value) => isPlainArgument(value)) ? { target, values } : undefined;
}

function forwardedText(text: string, values: readonly ESTree.Node[]) {
  const [first] = values;
  const last = values.at(-1);

  if (first === undefined || last === undefined) {
    return "";
  }

  return `, ${text.slice(first.range[0], last.range[1])}`;
}

function checkTimer(context: Context, node: ESTree.CallExpression) {
  const timer = timerName(context, node.callee);
  const found = timerArguments(node);

  if (timer === undefined || found === undefined) {
    return;
  }

  const { delay, scheduled } = found;
  const unwrapped = wrappedCall(context, scheduled, node) ?? boundCall(context, scheduled);

  if (unwrapped === undefined) {
    return;
  }

  const { sourceCode } = context;
  const { target, values } = unwrapped;

  context.report({
    data: { timer },
    fix: (fixer) => [
      fixer.replaceText(scheduled, sourceCode.getText(target)),
      fixer.insertTextAfter(delay, forwardedText(sourceCode.text, values)),
    ],
    messageId: "timerArguments",
    node,
  });
}

function urlArgumentList(context: Context, statement: ESTree.Statement | undefined) {
  const expression = statement?.type === "ExpressionStatement" ? statement.expression : undefined;

  const isUrl =
    expression?.type === "NewExpression" &&
    isGlobalNamed(context, expression.callee, "URL") &&
    expression.arguments.length > 0;

  if (!isUrl) {
    return;
  }

  return context.sourceCode.text.slice(expression.callee.range[1], expression.range[1]);
}

function urlProbe(context: Context, node: ESTree.TryStatement) {
  const { block, handler } = node;
  const [parse, next] = block.body;
  const list = urlArgumentList(context, parse);

  if (handler === null || parse === undefined || next === undefined || list === undefined) {
    return;
  }

  return { check: `URL.canParse${list}`, handler, next, node, parse };
}

function isValidator({ handler, next, node }: UrlProbe) {
  const [onError, ...afterError] = handler.body.body;

  return (
    node.block.body.length === 2 &&
    afterError.length === 0 &&
    returnedBoolean(next) === true &&
    returnedBoolean(onError) === false
  );
}

function guardFix(context: Context, { check, handler, next, node, parse }: UrlProbe) {
  const { block } = node;
  const { body } = handler;

  const isEmptyCatch =
    body.body.length === 0 && context.sourceCode.getCommentsInside(body).length === 0;

  return (fixer: Fixer) => [
    fixer.replaceTextRange([node.range[0], block.range[0]], `if (${check}) `),
    fixer.removeRange([parse.range[0], next.range[0]]),
    isEmptyCatch
      ? fixer.removeRange([block.range[1], handler.range[1]])
      : fixer.replaceTextRange([block.range[1], body.range[0]], " else "),
  ];
}

function probeSuggestions(context: Context, candidate: UrlProbe) {
  const { check, handler, node } = candidate;
  const returnsResult = isValidator(candidate);

  if (node.finalizer !== null || (!returnsResult && handler.param !== null)) {
    return [];
  }

  const fix = returnsResult
    ? (fixer: Fixer) => fixer.replaceText(node, `return ${check};`)
    : guardFix(context, candidate);

  return [{ fix, messageId: "useUrlCanParse" }];
}

function checkTry(context: Context, node: ESTree.TryStatement) {
  const candidate = urlProbe(context, node);

  if (candidate === undefined) {
    return;
  }

  context.report({
    messageId: "urlCanParse",
    node,
    suggest: probeSuggestions(context, candidate),
  });
}

export const preferModernApis = defineRule({
  meta: {
    docs: {
      description:
        "Require Array#fill(), timer arguments and URL.canParse() over the callbacks and try/catch blocks that emulate them.",
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      arrayFill:
        'The callback returns "{{value}}" for every element. Use "Array.from({ length: {{length}} }).fill({{value}})" instead.',
      timerArguments:
        '"{{timer}}()" forwards extra arguments to its callback. Pass the function and its arguments to it instead of wrapping the call.',
      urlCanParse:
        '"new URL()" runs here only to see whether it throws. Check the URL with "URL.canParse()" instead of try/catch.',
      useUrlCanParse: 'Rewrite this try/catch as a "URL.canParse()" check.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        checkArrayFrom(context, node);
        checkSpreadMap(context, node);
        checkTimer(context, node);
      },
      TryStatement(node) {
        checkTry(context, node);
      },
    };
  },
});
