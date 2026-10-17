import type { ESTree } from "@oxlint/plugins";

const STATIC_COLLECTIONS = new Set(["Map", "Set"]);
const CONSTANT_NAME = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/v;

export function unwrap(node: ESTree.Expression) {
  let current = node;

  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSNonNullExpression" ||
    current.type === "ParenthesizedExpression"
  ) {
    current = current.expression;
  }

  return current;
}

function elementChildren({ elements }: ESTree.ArrayExpression) {
  return elements.map((element) => {
    if (element?.type === "SpreadElement") {
      return element.argument;
    }

    return element ?? undefined;
  });
}

function propertyChildren({ properties }: ESTree.ObjectExpression) {
  return properties.map((property) => {
    if (property.type === "SpreadElement") {
      return property.argument;
    }

    return !property.computed && property.kind === "init" ? property.value : undefined;
  });
}

function collectionChildren({ arguments: values, callee }: ESTree.NewExpression) {
  const [argument] = values;
  const isCollection = callee.type === "Identifier" && STATIC_COLLECTIONS.has(callee.name);

  return isCollection && values.length === 1 && argument?.type === "ArrayExpression"
    ? [argument]
    : [undefined];
}

function staticChildren(node: ESTree.Expression) {
  if (node.type === "ArrayExpression") {
    return elementChildren(node);
  }

  if (node.type === "ObjectExpression") {
    return propertyChildren(node);
  }

  if (node.type === "TemplateLiteral") {
    return node.expressions;
  }

  return node.type === "NewExpression" ? collectionChildren(node) : [undefined];
}

function isStaticLeaf(node: ESTree.Expression) {
  if (node.type === "Identifier") {
    return CONSTANT_NAME.test(node.name);
  }

  if (node.type === "UnaryExpression") {
    return node.operator === "-" && node.argument.type === "Literal";
  }

  return node.type === "Literal";
}

export function isStaticValue(root: ESTree.Expression) {
  const pending: (ESTree.Expression | undefined)[] = [root];

  for (const node of pending) {
    if (node === undefined) {
      return false;
    }

    const current = unwrap(node);

    if (!isStaticLeaf(current)) {
      pending.push(...staticChildren(current));
    }
  }

  return true;
}

export function isModuleConstant({ parent }: ESTree.VariableDeclarator) {
  if (parent.type !== "VariableDeclaration" || parent.kind !== "const") {
    return false;
  }

  const owner =
    parent.parent.type === "ExportNamedDeclaration" ? parent.parent.parent : parent.parent;

  return owner.type === "Program";
}
