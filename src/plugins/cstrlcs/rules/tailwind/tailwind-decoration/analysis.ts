import type { DesignSystem } from "../shared/design-system.ts";
import type { Entry, Scope } from "../shared/scope.ts";

import { chromaOf } from "../shared/color.ts";
import { lengthPx, resolveValue } from "../shared/css.ts";
import { finding } from "../shared/finding.ts";

const SIDE_BORDER_WIDTH =
  /^border-(?:top|right|bottom|left|inline-start|inline-end|block-start|block-end)-width$/v;

const BORDER_COLOR = /^border-(?:[a-z\-]+-)?color$/v;
const SHADOW_OFFSETS = /^(?<x>\S+)\s+(?<y>\S+)\s+(?<blur>\S+)/v;
const MIN_STRIPE_PX = 2;
const MIN_STRIPE_CHROMA = 0.06;

function findPatterns(entries: Entry[], gradients: Entry[]) {
  const isTiledInPx = entries.some((entry) =>
    /\dpx/v.test(entry.declarations.get("background-size") ?? ""),
  );

  return gradients.flatMap(({ className, declarations }) => {
    const image = declarations.get("background-image") ?? "";

    if (/repeating-(?:linear|radial|conic)-gradient\(/v.test(image)) {
      return [finding(className, "decorativePattern", { pattern: "stripes" })];
    }

    const isGrid = isTiledInPx && (image.match(/linear-gradient\(/gv) ?? []).length > 1;

    return isGrid ? [finding(className, "decorativePattern", { pattern: "grid lines" })] : [];
  });
}

function findGradients({ entries }: Scope) {
  const gradients = entries.filter(
    (entry) => entry.declarations.get("background-image")?.includes("gradient(") === true,
  );

  const clipsText = entries.find((entry) => entry.declarations.get("background-clip") === "text");

  const hasTransparentText = entries.some(
    (entry) => entry.declarations.get("color") === "transparent",
  );

  const gradientText =
    clipsText !== undefined && hasTransparentText && gradients.length > 0
      ? [finding(clipsText.className, "gradientText")]
      : [];

  return [...gradientText, ...findPatterns(entries, gradients)];
}

function splitLayers(value: string) {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;

  for (const { 0: character, index } of value.matchAll(/[\(\),]/gv)) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (depth === 0) {
      layers.push(value.slice(start, index));
      start = index + 1;
    }
  }

  return [...layers, value.slice(start)];
}

function shadowLengthPx(value: string | undefined) {
  return value === "0" ? 0 : lengthPx(value);
}

function isOffsetless(layer: string) {
  const { blur, x, y } = SHADOW_OFFSETS.exec(layer.trim())?.groups ?? {};

  return shadowLengthPx(x) === 0 && shadowLengthPx(y) === 0 && (shadowLengthPx(blur) ?? 0) > 0;
}

function findGlow({ designSystem, entries }: Scope) {
  return entries.flatMap(({ className, declarations }) => {
    const shadow = resolveValue(designSystem, declarations.get("--tw-shadow")) ?? "";

    return splitLayers(shadow).some((layer) => isOffsetless(layer))
      ? [finding(className, "glow")]
      : [];
  });
}

function isSideStripe(designSystem: DesignSystem, declarations: Map<string, string>) {
  const widths = [...declarations].filter(
    ([property]) => property.startsWith("border-") && property.endsWith("-width"),
  );

  const [side] = widths;

  if (widths.length !== 1 || side === undefined || !SIDE_BORDER_WIDTH.test(side[0])) {
    return false;
  }

  return (lengthPx(resolveValue(designSystem, side[1])) ?? 0) >= MIN_STRIPE_PX;
}

function declaresAny(entries: Entry[], matches: (declaration: [string, string]) => boolean) {
  return entries.some(({ declarations }) =>
    [...declarations].some((declaration) => matches(declaration)),
  );
}

function findSideStripe({ designSystem, entries }: Scope) {
  const isRounded = declaresAny(
    entries,
    ([property, value]) => property.endsWith("radius") && resolveValue(designSystem, value) !== "0",
  );

  const isColored = declaresAny(
    entries,
    ([property, value]) =>
      BORDER_COLOR.test(property) &&
      (chromaOf(resolveValue(designSystem, value)) ?? 0) >= MIN_STRIPE_CHROMA,
  );

  if (!isRounded || !isColored) {
    return [];
  }

  return entries
    .filter((entry) => isSideStripe(designSystem, entry.declarations))
    .map((entry) => finding(entry.className, "sideStripe"));
}

export function findDecoration(scope: Scope) {
  return [...findGradients(scope), ...findGlow(scope), ...findSideStripe(scope)];
}
