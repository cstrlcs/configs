import type { ESTree } from "@oxlint/plugins";

type AttributeValue = ESTree.JSXAttribute["value"];

export interface Element {
  attributes: Map<string, ESTree.JSXAttribute>;
  hasSpread: boolean;
  name: string | undefined;
  node: ESTree.JSXOpeningElement;
}

export function toElement(node: ESTree.JSXOpeningElement) {
  const attributes = new Map<string, ESTree.JSXAttribute>();

  for (const attribute of node.attributes) {
    if (attribute.type === "JSXAttribute" && attribute.name.type === "JSXIdentifier") {
      attributes.set(attribute.name.name.toLowerCase(), attribute);
    }
  }

  return {
    attributes,
    hasSpread: node.attributes.some((attribute) => attribute.type === "JSXSpreadAttribute"),
    name: node.name.type === "JSXIdentifier" ? node.name.name : undefined,
    node,
  } satisfies Element;
}

function staticValue(value: AttributeValue | undefined) {
  if (value === null) {
    return true;
  }

  const literal = value?.type === "JSXExpressionContainer" ? value.expression : value;

  return literal?.type === "Literal" ? literal.value : undefined;
}

export function valueOf({ attributes }: Element, name: string) {
  return staticValue(attributes.get(name)?.value);
}
