import type { Element } from "../shared/element.ts";
import { defineRule } from "@oxlint/plugins";

import { toElement, valueOf } from "../shared/element.ts";

const AUTOCOMPLETE_TYPES = new Set(["email", "password", "tel"]);

const PERSONAL_FIELD =
  /^(?:e[\-_]?mail|phone|tel(?:ephone)?|(?:first|last|given|family|full|user)[\-_]?name|name|address|street|city|zip|postal[\-_]?code|country|password)$/iv;

function needsAutocomplete(element: Element) {
  const type = valueOf(element, "type");
  const name = valueOf(element, "name");

  if (
    element.name !== "input" ||
    element.hasSpread ||
    element.attributes.has("autocomplete") ||
    type === "hidden"
  ) {
    return false;
  }

  return (
    (typeof type === "string" && AUTOCOMPLETE_TYPES.has(type)) ||
    (typeof name === "string" && PERSONAL_FIELD.test(name))
  );
}

export const uiAutocomplete = defineRule({
  meta: {
    docs: {
      description: "Require autoComplete on inputs that collect personal data.",
    },
    messages: {
      missingAutocomplete:
        "Personal data fields need autoComplete with the matching token, such as email, tel or current-password.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        if (needsAutocomplete(toElement(node))) {
          context.report({ messageId: "missingAutocomplete", node });
        }
      },
    };
  },
});
