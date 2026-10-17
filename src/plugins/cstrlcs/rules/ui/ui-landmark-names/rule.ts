import type { Element } from "../shared/element.ts";
import type { Context } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { toElement } from "../shared/element.ts";

const GENERIC_ELEMENTS = new Set(["div", "span"]);
const NAMING_ATTRIBUTES = ["aria-label", "aria-labelledby"];

function isNamed({ attributes }: Element) {
  return NAMING_ATTRIBUTES.some((name) => attributes.has(name));
}

function checkGenericName(context: Context, { attributes, hasSpread, name }: Element) {
  const label = NAMING_ATTRIBUTES.map((attribute) => attributes.get(attribute)).find(Boolean);

  if (label === undefined || name === undefined || !GENERIC_ELEMENTS.has(name)) {
    return;
  }

  if (!attributes.has("role") && !hasSpread) {
    context.report({ data: { element: name }, messageId: "namedGeneric", node: label });
  }
}

export const uiLandmarkNames = defineRule({
  meta: {
    docs: {
      description:
        "Name landmarks that need a name, and keep names off generic elements without a role.",
    },
    messages: {
      namedGeneric:
        "ARIA prohibits naming a <{{element}}> without a role, and screen readers ignore it. Use visible text, aria-labelledby on a landmark, or a real role.",
      unnamedNav:
        "This page has several <nav> elements. Name each with aria-label or aria-labelledby.",
      unnamedSection:
        "A <section> is a landmark only when named. Add aria-labelledby pointing at its heading, or use a <div>.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    let navs: Element[] = [];

    return {
      before() {
        navs = [];
      },
      JSXOpeningElement(node) {
        const element = toElement(node);

        if (element.name === "nav") {
          navs.push(element);
        }

        if (element.name === "section" && !isNamed(element) && !element.hasSpread) {
          context.report({ messageId: "unnamedSection", node });
        }

        checkGenericName(context, element);
      },
      "Program:exit"() {
        if (navs.length < 2) {
          return;
        }

        for (const nav of navs.filter((element) => !isNamed(element) && !element.hasSpread)) {
          context.report({ messageId: "unnamedNav", node: nav.node });
        }
      },
    };
  },
});
