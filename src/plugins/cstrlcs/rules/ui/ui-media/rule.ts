import type { Element } from "../shared/element.ts";
import { defineRule } from "@oxlint/plugins";

import { toElement, valueOf } from "../shared/element.ts";

const WIDTH_DESCRIPTOR = /\s\d+w\s*(?:,|$)/v;

function isMuted(element: Element) {
  return element.attributes.has("muted") && valueOf(element, "muted") !== false;
}

export const uiMedia = defineRule({
  meta: {
    docs: {
      description: "Mute autoplaying video, and give a width-descriptor srcSet its sizes.",
    },
    messages: {
      autoplayWithSound:
        "A <video> that autoplays must be muted. Add muted, or start playback from a control.",
      srcSetWithoutSizes:
        "A srcSet with width descriptors needs sizes, or the browser assumes the image spans the viewport.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        const element = toElement(node);
        const srcSet = valueOf(element, "srcset");

        if (element.hasSpread) {
          return;
        }

        if (
          element.name === "video" &&
          valueOf(element, "autoplay") === true &&
          !isMuted(element)
        ) {
          context.report({ messageId: "autoplayWithSound", node });
        }

        if (
          typeof srcSet === "string" &&
          WIDTH_DESCRIPTOR.test(srcSet) &&
          !element.attributes.has("sizes")
        ) {
          context.report({ messageId: "srcSetWithoutSizes", node });
        }
      },
    };
  },
});
