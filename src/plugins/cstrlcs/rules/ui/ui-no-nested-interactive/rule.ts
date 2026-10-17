import type { Element } from "../shared/element.ts";
import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { toElement, valueOf } from "../shared/element.ts";

function isInteractive(element: Element) {
  const { attributes, name } = element;

  if (name === "a") {
    return attributes.has("href");
  }

  if (name === "input") {
    return valueOf(element, "type") !== "hidden";
  }

  return name === "button" || name === "select" || name === "textarea";
}

function hasInteractiveAncestor(node: ESTree.JSXOpeningElement) {
  for (let current = node.parent.parent; current !== null; current = current.parent) {
    if (current.type === "JSXElement" && isInteractive(toElement(current.openingElement))) {
      return true;
    }
  }

  return false;
}

export const uiNoNestedInteractive = defineRule({
  meta: {
    docs: {
      description: "Forbid a native control inside another interactive element.",
    },
    messages: {
      nestedInteractive:
        "<{{element}}> is nested inside another interactive element. Render one control, or move this one outside.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        const element = toElement(node);
        const { name } = element;

        if (name !== undefined && isInteractive(element) && hasInteractiveAncestor(node)) {
          context.report({ data: { element: name }, messageId: "nestedInteractive", node });
        }
      },
    };
  },
});
