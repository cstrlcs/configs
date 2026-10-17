import type { Scope } from "../shared/scope.ts";

import { finding } from "../shared/finding.ts";

const MOTION_PROPERTIES = ["animation", "transition-property", "filter", "backdrop-filter"];

export function findIdleWillChange({ entries }: Scope) {
  const isMoving = entries.some(({ declarations }) =>
    MOTION_PROPERTIES.some((property) => declarations.has(property)),
  );

  if (isMoving) {
    return [];
  }

  return entries
    .filter((entry) => entry.prefix === "" && entry.declarations.has("will-change"))
    .filter((entry) => entry.declarations.get("will-change") !== "auto")
    .map((entry) => finding(entry.className, "idleWillChange"));
}
