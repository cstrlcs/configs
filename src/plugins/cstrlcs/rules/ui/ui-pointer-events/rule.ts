import { defineRule } from "@oxlint/plugins";

import { toElement } from "../shared/element.ts";

const MOUSE_HANDLERS = new Map([
  ["onmousedown", "onPointerDown"],
  ["onmousemove", "onPointerMove"],
  ["onmouseup", "onPointerUp"],
]);

export const uiPointerEvents = defineRule({
  meta: {
    docs: {
      description:
        "Handle pointer events instead of mouse-only events, and reset a gesture on pointer cancel.",
    },
    messages: {
      mouseOnly: "Mouse events miss touch and pen. Use {{pointer}} instead.",
      pointerWithoutCancel:
        "onPointerUp needs onPointerCancel, and onLostPointerCapture when the gesture captures the pointer, so an interrupted gesture resets.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        const { attributes, hasSpread } = toElement(node);
        const pointerUp = attributes.get("onpointerup");

        if (hasSpread) {
          return;
        }

        for (const [mouse, pointer] of MOUSE_HANDLERS) {
          const handler = attributes.get(mouse);

          if (handler !== undefined && !attributes.has(pointer.toLowerCase())) {
            context.report({ data: { pointer }, messageId: "mouseOnly", node: handler });
          }
        }

        if (pointerUp !== undefined && !attributes.has("onpointercancel")) {
          context.report({ messageId: "pointerWithoutCancel", node: pointerUp });
        }
      },
    };
  },
});
