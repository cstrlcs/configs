import type { ESTree } from "@oxlint/plugins";

export interface ClassToken {
  range: [number, number];
  removal: [number, number];
  value: string;
}

export interface ClassLiteral {
  classes: ClassToken[];
  group: number;
  partial: ClassToken[];
}

interface Scan {
  keys: boolean;
  strings: boolean;
  values?: RegExp;
}

interface Position {
  scan: Scan;
  path?: string;
}

interface Pending {
  node: Scanned | null;
  position: Position;
}

type StringNode = ESTree.StringLiteral | ESTree.TemplateElement;
type Scanned = ESTree.Expression | ESTree.SpreadElement;
type Wrapper = ESTree.TSAsExpression | ESTree.TSNonNullExpression | ESTree.TSSatisfiesExpression;

const STRINGS: Scan = { keys: false, strings: true };
const STRINGS_AND_KEYS: Scan = { keys: true, strings: true };

const CALLEES = new Map<string, Scan>([
  ["clsx", STRINGS_AND_KEYS],
  ["cn", STRINGS_AND_KEYS],
  ["cx", STRINGS_AND_KEYS],
  ["twJoin", STRINGS],
  ["twMerge", STRINGS],
  [
    "cva",
    {
      keys: false,
      strings: true,
      values: /^(?:variants|compoundVariants\[\d+\]\.(?:class|className)$)/v,
    },
  ],
  [
    "tv",
    {
      keys: false,
      strings: true,
      values: /^(?:variants|base$|slots|compound(?:Variants|Slots)\[\d+\]\.(?:class|className))/v,
    },
  ],
]);

const WRAPPER_TYPES = new Set<string>([
  "TSAsExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
]);

const CLASS_ATTRIBUTE = /^class(?:Name)?$/iv;
const CLASS_VARIABLE = /^(?:classNames?|classes|styles?)$/v;

function isStringAllowed({ path, scan }: Position) {
  if (path === undefined) {
    return scan.strings;
  }

  return scan.values?.test(path) === true;
}

function isStringLiteral(node: ESTree.Node): node is ESTree.StringLiteral {
  return node.type === "Literal" && typeof node.value === "string";
}

function isWrapper(node: ESTree.Node): node is Wrapper {
  return WRAPPER_TYPES.has(node.type);
}

function propertyName({ computed, key }: ESTree.ObjectProperty) {
  if (computed) {
    return;
  }

  if (key.type === "Identifier") {
    return key.name;
  }

  if (!isStringLiteral(key)) {
    return;
  }

  return key.value;
}

function nest({ path, scan }: Position, key: string) {
  if (path === undefined) {
    return { path: key, scan };
  }

  return { path: `${path}${key.startsWith("[") ? "" : "."}${key}`, scan };
}

function ownStrings(node: Scanned, position: Position) {
  if (isStringLiteral(node) && isStringAllowed(position)) {
    return [node];
  }

  if (node.type === "TemplateLiteral" && isStringAllowed(position)) {
    return node.quasis;
  }

  if (node.type !== "ObjectExpression" || !position.scan.keys) {
    return [];
  }

  return node.properties.flatMap((property) =>
    property.type === "Property" && isStringLiteral(property.key) ? [property.key] : [],
  );
}

function branches(node: Scanned) {
  if (isWrapper(node)) {
    return [node.expression];
  }

  if (node.type === "SpreadElement") {
    return [node.argument];
  }

  if (node.type === "ConditionalExpression") {
    return [node.consequent, node.alternate];
  }

  if (node.type === "LogicalExpression") {
    return [node.right];
  }

  if (node.type === "TemplateLiteral") {
    return node.expressions;
  }

  return node.type === "BinaryExpression" && node.operator === "+" ? [node.left, node.right] : [];
}

function propertyChildren(property: ESTree.ObjectPropertyKind, position: Position) {
  if (property.type === "SpreadElement") {
    return [{ node: property, position }];
  }

  const name = propertyName(property);

  return name === undefined ? [] : [{ node: property.value, position: nest(position, name) }];
}

function children(node: Scanned, position: Position) {
  if (node.type === "ObjectExpression") {
    return node.properties.flatMap<Pending>((property) => propertyChildren(property, position));
  }

  if (node.type !== "ArrayExpression") {
    return branches(node).map((child) => ({ node: child, position }));
  }

  return node.elements.map((element, index) => {
    if (element?.type === "ObjectExpression" && position.path !== undefined) {
      return { node: element, position: nest(position, `[${index}]`) };
    }

    return { node: element, position };
  });
}

function scanExpression(root: Scanned | null, scan: Scan) {
  const strings: StringNode[] = [];
  const pending: Pending[] = [{ node: root, position: { scan } }];

  for (const { node, position } of pending) {
    if (node !== null) {
      strings.push(...ownStrings(node, position));
      pending.push(...children(node, position));
    }
  }

  return strings;
}

function concatenation(node: ESTree.Node) {
  const sides = { left: false, right: false };
  let current = node;

  while (current.parent?.type === "BinaryExpression" && current.parent.operator === "+") {
    if (current.parent.left === current) {
      sides.right = true;
    } else {
      sides.left = true;
    }

    current = current.parent;
  }

  return sides;
}

function locate(node: StringNode, text: string) {
  if (node.type === "Literal") {
    return {
      content: text.slice(node.range[0] + 1, node.range[1] - 1),
      sides: concatenation(node),
    };
  }

  const template = node.parent;

  const outer =
    template.type === "TemplateLiteral" ? concatenation(template) : { left: false, right: false };

  const isFirst = template.type === "TemplateLiteral" && template.quasis[0] === node;

  return {
    content: node.value.raw,
    sides: { left: !isFirst || outer.left, right: !node.tail || outer.right },
  };
}

function tokenize(content: string, offset: number) {
  const matches = [...content.matchAll(/\S+/gv)];

  return matches.map((match, index) => {
    const start = offset + match.index;
    const end = start + match[0].length;
    const previous = matches[index - 1];
    const next = matches[index + 1];

    const previousEnd =
      previous === undefined ? undefined : offset + previous.index + previous[0].length;

    const nextStart = next === undefined ? end : offset + next.index;

    return {
      range: [start, end],
      removal: previousEnd === undefined ? [start, nextStart] : [previousEnd, end],
      value: match[0],
    } satisfies ClassToken;
  });
}

export function toClassLiteral(node: StringNode, text: string, group: number) {
  const { content, sides } = locate(node, text);
  const tokens = tokenize(content, node.range[0] + 1);
  const lastIndex = tokens.length - 1;

  function isPartial(index: number) {
    return (
      (index === 0 && sides.left && !/^\s/v.test(content)) ||
      (index === lastIndex && sides.right && !/\s$/v.test(content))
    );
  }

  return {
    classes: tokens.filter((token, index) => !isPartial(index) && !token.value.includes("\\")),
    group,
    partial: tokens.filter((_, index) => isPartial(index)),
  } satisfies ClassLiteral;
}

function attributeScan(name: ESTree.JSXAttributeName) {
  if (name.type !== "JSXIdentifier") {
    return;
  }

  if (CLASS_ATTRIBUTE.test(name.name)) {
    return STRINGS;
  }

  if (name.name !== "classList") {
    return;
  }

  return { keys: true, strings: false };
}

function scanAttribute(node: ESTree.JSXAttribute) {
  const scan = attributeScan(node.name);

  if (scan === undefined || node.value === null) {
    return [];
  }

  if (node.value.type === "Literal") {
    return scan.strings ? [node.value] : [];
  }

  if (
    node.value.type !== "JSXExpressionContainer" ||
    node.value.expression.type === "JSXEmptyExpression"
  ) {
    return [];
  }

  return scanExpression(node.value.expression, scan);
}

function scanCall(node: ESTree.CallExpression) {
  if (node.callee.type !== "Identifier") {
    return [];
  }

  const scan = CALLEES.get(node.callee.name);

  if (scan === undefined) {
    return [];
  }

  return node.arguments.flatMap((argument) => scanExpression(argument, scan));
}

function scanVariable(node: ESTree.VariableDeclarator) {
  if (node.id.type !== "Identifier" || !CLASS_VARIABLE.test(node.id.name)) {
    return [];
  }

  return scanExpression(node.init, STRINGS);
}

export function createCollector(collect: (nodes: StringNode[]) => void) {
  return {
    CallExpression(node: ESTree.CallExpression) {
      collect(scanCall(node));
    },
    JSXAttribute(node: ESTree.JSXAttribute) {
      collect(scanAttribute(node));
    },
    VariableDeclarator(node: ESTree.VariableDeclarator) {
      collect(scanVariable(node));
    },
  };
}
