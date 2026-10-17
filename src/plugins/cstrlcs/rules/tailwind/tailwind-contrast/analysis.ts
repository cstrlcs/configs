import type { Scope } from "../shared/scope.ts";

import { contrastRatio, luminance } from "../shared/color.ts";
import { lengthPx, resolveValue } from "../shared/css.ts";
import { finding } from "../shared/finding.ts";
import { declaringEntry, valueIn } from "../shared/scope.ts";

const LARGE_TEXT_PX = 24;
const LARGE_BOLD_TEXT_PX = 18.66;
const BOLD_WEIGHT = 700;
const NORMAL_TEXT_CONTRAST = 4.5;
const LARGE_TEXT_CONTRAST = 3;

function minimumContrast(scope: Scope, prefix: string) {
  const fontPx = lengthPx(valueIn(scope, "font-size", prefix)) ?? 0;
  const weight = Number(valueIn(scope, "font-weight", prefix) ?? 400);

  const isLarge =
    fontPx >= LARGE_TEXT_PX || (fontPx >= LARGE_BOLD_TEXT_PX && weight >= BOLD_WEIGHT);

  return isLarge ? LARGE_TEXT_CONTRAST : NORMAL_TEXT_CONTRAST;
}

function contrastPair(scope: Scope, prefix: string) {
  const text = declaringEntry(scope, "color", prefix);
  const surface = declaringEntry(scope, "background-color", prefix);

  if (text === undefined || surface === undefined) {
    return;
  }

  if (prefix !== "" && text.prefix !== prefix && surface.prefix !== prefix) {
    return;
  }

  return { surface, text };
}

function findPrefixContrast(scope: Scope, prefix: string) {
  const pair = contrastPair(scope, prefix);

  const foreground = luminance(
    resolveValue(scope.designSystem, pair?.text.declarations.get("color")),
  );

  const background = luminance(
    resolveValue(scope.designSystem, pair?.surface.declarations.get("background-color")),
  );

  const minimum = minimumContrast(scope, prefix);

  if (pair === undefined || foreground === undefined || background === undefined) {
    return [];
  }

  const ratio = contrastRatio(foreground, background);

  if (ratio >= minimum) {
    return [];
  }

  const data = {
    background: pair.surface.className,
    minimum: String(minimum),
    ratio: ratio.toFixed(2),
  };

  return [finding(pair.text.className, "contrast", data)];
}

export function findContrast(scope: Scope) {
  const prefixes = [...new Set(scope.entries.map((entry) => entry.prefix))];

  return prefixes.flatMap((prefix) => findPrefixContrast(scope, prefix));
}
