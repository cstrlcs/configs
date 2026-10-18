import type { Context, ESTree, Reference, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { unwrap } from "../shared/constants.ts";
import { tokenValues } from "../shared/tokens.ts";

interface KeyWrite {
  collection: string;
  key: string;
  label: string;
  node: ESTree.Node;
}

const COLLECTION_CONSTRUCTORS = new Set(["Array", "Map", "Set", "WeakMap", "WeakSet"]);
const ELEMENT_WRITE_OPERATORS = new Set(["&&=", "=", "??=", "||="]);
const BOUND_DEFINITIONS = new Set(["ImportBinding", "Parameter"]);

const ENTRY_ARITIES = new Map([
  ["add", 1],
  ["set", 2],
]);

const WRITING_METHODS = new Set([
  "add",
  "clear",
  "copyWithin",
  "delete",
  "fill",
  "pop",
  "push",
  "reverse",
  "set",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

const READING_METHODS = new Set([
  "clear",
  "concat",
  "copyWithin",
  "delete",
  "entries",
  "every",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "get",
  "has",
  "includes",
  "indexOf",
  "join",
  "keys",
  "lastIndexOf",
  "map",
  "pop",
  "reduce",
  "reduceRight",
  "reverse",
  "shift",
  "slice",
  "some",
  "sort",
  "toLocaleString",
  "toString",
  "values",
]);

function mentions(context: Context, expressions: readonly ESTree.Node[], target: ESTree.Node) {
  const needle = tokenValues(context, target);

  return expressions.some((expression) => {
    const haystack = tokenValues(context, expression);

    return haystack.some((_, start) =>
      needle.every((value, offset) => haystack[start + offset] === value),
    );
  });
}

function keyOf(node: ESTree.Node, isEntry: boolean) {
  if (node.type === "Identifier") {
    return { key: `name:${node.name}`, label: node.name };
  }

  if (
    node.type !== "Literal" ||
    (typeof node.value !== "string" && typeof node.value !== "number")
  ) {
    return;
  }

  const label = String(node.value);

  return { key: isEntry ? `${typeof node.value}:${label}` : `value:${label}`, label };
}

function elementWrite(context: Context, node: ESTree.AssignmentExpression) {
  const { left, operator, right } = node;

  if (operator !== "=" || left.type !== "MemberExpression" || !left.computed) {
    return;
  }

  const property = keyOf(left.property, false);

  if (property === undefined || mentions(context, [right], left.object)) {
    return;
  }

  return {
    collection: tokenValues(context, left.object).join(" "),
    key: `element:${property.key}`,
    label: property.label,
    node,
  };
}

function entryWrite(context: Context, node: ESTree.CallExpression) {
  const { arguments: values, callee } = node;
  const [first] = values;

  if (
    callee.type !== "MemberExpression" ||
    callee.property.type !== "Identifier" ||
    first === undefined ||
    ENTRY_ARITIES.get(callee.property.name) !== values.length
  ) {
    return;
  }

  const entry = keyOf(first, true);

  if (entry === undefined || mentions(context, values, callee.object)) {
    return;
  }

  return {
    collection: tokenValues(context, callee.object).join(" "),
    key: `entry:${entry.key}`,
    label: entry.label,
    node,
  };
}

function keyWrite(context: Context, statement: ESTree.Node) {
  if (statement.type !== "ExpressionStatement") {
    return;
  }

  const { expression } = statement;

  if (expression.type === "AssignmentExpression") {
    return elementWrite(context, expression);
  }

  return expression.type === "CallExpression" ? entryWrite(context, expression) : undefined;
}

function reportOverwrite(context: Context, writes: Map<string, KeyWrite>, write: KeyWrite) {
  const original = writes.get(write.key);

  writes.set(write.key, write);

  if (original === undefined) {
    return;
  }

  context.report({
    data: { key: write.label, line: original.node.loc.start.line },
    messageId: "overwrittenElement",
    node: write.node,
  });
}

function checkStatements(context: Context, statements: readonly ESTree.Node[]) {
  const writes = new Map<string, KeyWrite>();

  for (const statement of statements) {
    const write = keyWrite(context, statement);
    const [previous] = writes.values();

    if (write === undefined || previous?.collection !== write.collection) {
      writes.clear();
    }

    if (write !== undefined) {
      reportOverwrite(context, writes, write);
    }
  }
}

function isExported({ defs }: Variable) {
  return defs.some(({ parent }) => parent?.parent?.type === "ExportNamedDeclaration");
}

function assignedValue({ identifier }: Reference) {
  const { parent } = identifier;

  if (parent.type === "VariableDeclarator" && parent.id === identifier) {
    return parent.init;
  }

  if (
    parent.type === "AssignmentExpression" &&
    parent.operator === "=" &&
    parent.left === identifier &&
    parent.parent.type === "ExpressionStatement"
  ) {
    return parent.right;
  }

  return null;
}

function constructedSize(value: ESTree.Expression) {
  if (
    (value.type !== "CallExpression" && value.type !== "NewExpression") ||
    value.callee.type !== "Identifier" ||
    !COLLECTION_CONSTRUCTORS.has(value.callee.name)
  ) {
    return;
  }

  return value.arguments.length;
}

function collectionSize(reference: Reference) {
  const assigned = assignedValue(reference);

  if (assigned === null) {
    return;
  }

  const value = unwrap(assigned);

  return value.type === "ArrayExpression" ? value.elements.length : constructedSize(value);
}

function calledMethod(member: ESTree.MemberExpression) {
  const { parent, property } = member;

  if (
    parent.type !== "CallExpression" ||
    parent.callee !== member ||
    property.type !== "Identifier"
  ) {
    return "";
  }

  return property.name;
}

function isElementWrite(member: ESTree.MemberExpression) {
  let current: ESTree.Node = member;

  while (current.parent !== null && current.parent.type !== "AssignmentExpression") {
    current = current.parent;
  }

  const assignment = current.parent;

  return (
    assignment?.type === "AssignmentExpression" &&
    ELEMENT_WRITE_OPERATORS.has(assignment.operator) &&
    assignment.left === current
  );
}

function isContentRead({ identifier }: Reference) {
  const { parent } = identifier;

  if (parent.type === "ForInStatement" || parent.type === "ForOfStatement") {
    return parent.right === identifier;
  }

  if (parent.type !== "MemberExpression" || parent.object !== identifier) {
    return false;
  }

  if (parent.computed) {
    return !isElementWrite(parent);
  }

  return READING_METHODS.has(calledMethod(parent));
}

function isContentWrite({ identifier }: Reference) {
  const { parent } = identifier;

  if (
    parent.type !== "MemberExpression" ||
    parent.object !== identifier ||
    parent.parent.parent?.type !== "ExpressionStatement"
  ) {
    return false;
  }

  const user = parent.parent;

  if (user.type === "AssignmentExpression") {
    return user.left === parent;
  }

  return WRITING_METHODS.has(calledMethod(parent));
}

function collectionSizes(variable: Variable) {
  const { defs, references } = variable;
  const writes = references.filter((reference) => reference.isWriteOnly());

  if (
    writes.length === 0 ||
    references.length < 2 ||
    isExported(variable) ||
    defs.some(({ type }) => BOUND_DEFINITIONS.has(type))
  ) {
    return;
  }

  const sizes = writes.map((reference) => collectionSize(reference));

  return sizes.includes(undefined) ? undefined : sizes;
}

function checkVariable(context: Context, variable: Variable) {
  const { identifiers, name, references } = variable;
  const [declaration] = identifiers;
  const sizes = collectionSizes(variable);

  if (declaration === undefined || sizes === undefined) {
    return;
  }

  const uses = references.filter((reference) => !reference.isWriteOnly());

  if (uses.length > 0 && uses.every((use) => isContentWrite(use))) {
    context.report({ data: { name }, messageId: "unusedCollection", node: declaration });

    return;
  }

  if (sizes.some((size) => size !== 0) || !uses.every((use) => isContentRead(use))) {
    return;
  }

  for (const { identifier } of uses) {
    context.report({ data: { name }, messageId: "emptyCollection", node: identifier });
  }
}

export const noUselessCollections = defineRule({
  meta: {
    docs: {
      description:
        "Forbid collections that are never filled, never read, or overwritten before being read.",
    },
    messages: {
      emptyCollection:
        '"{{name}}" is always empty here, because nothing ever adds to it. Fill it, or remove this read.',
      overwrittenElement:
        '"{{key}}" is set again before the value from line {{line}} is read. Remove the earlier write, or correct the key.',
      unusedCollection:
        '"{{name}}" receives elements but nothing ever reads them. Read the collection, or delete it along with its writes.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    return {
      BlockStatement(node) {
        checkStatements(context, node.body);
      },
      Program(node) {
        checkStatements(context, node.body);

        for (const scope of context.sourceCode.scopeManager.scopes) {
          if (scope.type !== "global") {
            for (const variable of scope.variables) {
              checkVariable(context, variable);
            }
          }
        }
      },
      SwitchCase(node) {
        checkStatements(context, node.consequent);
      },
    };
  },
});
