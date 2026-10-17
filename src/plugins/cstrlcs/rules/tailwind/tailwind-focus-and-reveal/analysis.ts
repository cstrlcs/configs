import type { Scope } from "../shared/scope.ts";

import { finding } from "../shared/finding.ts";

const HIDDEN_VALUES = new Map([
  ["opacity", new Set(["0", "0%"])],
  ["visibility", new Set(["hidden"])],
]);

function findHiddenOutline({ entries }: Scope) {
  const focusEntries = entries.filter((entry) => entry.prefix.includes("focus"));
  const hasRing = focusEntries.some((entry) => entry.declarations.has("--tw-ring-shadow"));
  const hasOutline = focusEntries.some((entry) => entry.declarations.has("outline-width"));

  if (!hasRing || hasOutline) {
    return [];
  }

  return entries.flatMap(({ className }) => {
    const replacement = className.replace(/outline-none(?=!?$)/v, "outline-hidden");

    return replacement === className
      ? []
      : [{ ...finding(className, "hiddenOutline", { replacement }), replacement }];
  });
}

function findHoverOnlyReveal({ entries }: Scope) {
  return [...HIDDEN_VALUES].flatMap(([property, hidden]) => {
    const declaring = entries.filter((entry) => entry.declarations.has(property));

    const isHidden = declaring.some(
      (entry) => entry.prefix === "" && hidden.has(entry.declarations.get(property) ?? ""),
    );

    if (!isHidden || declaring.some((entry) => entry.prefix.includes("focus"))) {
      return [];
    }

    return declaring
      .filter((entry) => entry.prefix.includes("hover"))
      .map((entry) => finding(entry.className, "hoverOnlyReveal"));
  });
}

export function findFocusAndReveal(scope: Scope) {
  return [...findHiddenOutline(scope), ...findHoverOnlyReveal(scope)];
}
