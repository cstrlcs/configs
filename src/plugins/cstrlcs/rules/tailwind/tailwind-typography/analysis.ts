import type { Finding } from "../shared/finding.ts";
import type { Entry, Scope } from "../shared/scope.ts";

import { lengthPx, resolveValue, ROOT_FONT_SIZE_PX, splitVariants } from "../shared/css.ts";
import { finding } from "../shared/finding.ts";
import { valueIn } from "../shared/scope.ts";

const LETTER_SPACING = /^(?<amount>-?[\d.]+)(?<unit>em|px|rem)$/v;
const MIN_TEXT_PX = 11;
const MAX_TEXT_PX = 96;
const MIN_TRACKING_EM = -0.04;
const WIDE_TRACKING_EM = 0.05;

function findTextSize({ designSystem, entries }: Scope) {
  const isScreenReaderOnly = entries.some(
    (entry) => splitVariants(entry.className).utility === "sr-only",
  );

  return entries.flatMap<Finding<"hugeText" | "tinyText">>(({ className, declarations }) => {
    const px = lengthPx(resolveValue(designSystem, declarations.get("font-size")));

    if (px === undefined) {
      return [];
    }

    if (px > MAX_TEXT_PX) {
      return [finding(className, "hugeText", { px: String(px) })];
    }

    return px < MIN_TEXT_PX && !isScreenReaderOnly
      ? [finding(className, "tinyText", { px: String(px) })]
      : [];
  });
}

function trackingEm(scope: Scope, entry: Entry) {
  const value = resolveValue(scope.designSystem, entry.declarations.get("letter-spacing"));
  const { amount, unit } = LETTER_SPACING.exec(value ?? "")?.groups ?? {};
  const fontPx = lengthPx(valueIn(scope, "font-size", entry.prefix)) ?? ROOT_FONT_SIZE_PX;

  if (amount === undefined) {
    return;
  }

  if (unit === "em") {
    return Number(amount);
  }

  return (lengthPx(value) ?? 0) / fontPx;
}

function trackingFinding(entry: Entry, em: number, isUppercase: boolean) {
  const shown = String(Number(em.toFixed(3)));

  if (em < MIN_TRACKING_EM) {
    return [finding(entry.className, "tightTracking", { em: shown })];
  }

  return em <= WIDE_TRACKING_EM || isUppercase
    ? []
    : [finding(entry.className, "wideTracking", { em: shown })];
}

function findTracking(scope: Scope) {
  const isUppercase = scope.entries.some(
    (entry) => entry.declarations.get("text-transform") === "uppercase",
  );

  return scope.entries.flatMap<Finding<"tightTracking" | "wideTracking">>((entry) => {
    const tracking = trackingEm(scope, entry);

    return tracking === undefined ? [] : trackingFinding(entry, tracking, isUppercase);
  });
}

export function findTypographyIssues(scope: Scope) {
  return [...findTextSize(scope), ...findTracking(scope)];
}
