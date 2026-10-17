import type { Context, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { toElement, valueOf } from "../shared/element.ts";

const MIN_ZOOM_SCALE = 2;
const VIEWPORT_ZOOM_LOCK = /maximum-scale\s*=\s*(?<scale>[\d.]+)|user-scalable\s*=\s*(?:no|0)/iv;

function blocksZoom(content: unknown) {
  const match = typeof content === "string" ? VIEWPORT_ZOOM_LOCK.exec(content) : null;
  const { scale } = match?.groups ?? {};

  return match !== null && (scale === undefined || Number(scale) < MIN_ZOOM_SCALE);
}

function unwrap(node: ESTree.Expression | null | undefined) {
  let current = node;

  while (current?.type === "TSSatisfiesExpression" || current?.type === "TSAsExpression") {
    current = current.expression;
  }

  return current;
}

function locksZoom(property: ESTree.ObjectPropertyKind) {
  if (property.type !== "Property" || property.key.type !== "Identifier") {
    return false;
  }

  const { key, value } = property;

  if (value.type !== "Literal") {
    return false;
  }

  if (key.name === "userScalable") {
    return value.value === false;
  }

  return (
    key.name === "maximumScale" && typeof value.value === "number" && value.value < MIN_ZOOM_SCALE
  );
}

function checkViewportExport(context: Context, node: ESTree.VariableDeclarator) {
  const init = unwrap(node.init);

  if (
    node.id.type !== "Identifier" ||
    node.id.name !== "viewport" ||
    node.parent.parent?.type !== "ExportNamedDeclaration" ||
    init?.type !== "ObjectExpression"
  ) {
    return;
  }

  for (const property of init.properties.filter((candidate) => locksZoom(candidate))) {
    context.report({ messageId: "zoomDisabled", node: property });
  }
}

export const uiZoomable = defineRule({
  meta: {
    docs: {
      description: "Let the page zoom to 200% and let text follow the user's font size.",
    },
    messages: {
      fixedFontScale:
        "allowFontScaling={false} ignores the user's text size. Let text scale and reflow the layout.",
      zoomDisabled:
        "This viewport blocks zooming. Remove maximum-scale and user-scalable so the page can zoom to 200%.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        const element = toElement(node);
        const isViewport = element.name === "meta" && valueOf(element, "name") === "viewport";

        if (isViewport && blocksZoom(valueOf(element, "content"))) {
          context.report({ messageId: "zoomDisabled", node });
        }

        if (valueOf(element, "allowfontscaling") === false) {
          context.report({ messageId: "fixedFontScale", node });
        }
      },
      VariableDeclarator(node) {
        checkViewportExport(context, node);
      },
    };
  },
});
