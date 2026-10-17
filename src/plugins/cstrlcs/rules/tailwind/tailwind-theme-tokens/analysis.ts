import type { DesignSystem } from "../shared/design-system.ts";
import type { Finding } from "../shared/finding.ts";
import type { Entry, Scope } from "../shared/scope.ts";

import { lengthPx, namedLengths, PILL_RADIUS_PX, resolveValue } from "../shared/css.ts";
import { finding } from "../shared/finding.ts";

const COLOR_PROPERTY = /(?:^|-)color$|^(?:fill|stroke)$|^--tw-gradient-(?:from|via|to)$/v;
const LITERAL_COLOR = /^(?:#[\da-f]{3,8}|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\()/iv;
const LITERAL_LENGTH = /^-?[\d.]+(?:px|rem|em)$/v;
const THEME_REFERENCE = /var\(|--|theme\(/v;
const SPACING_PROPERTY = /^(?:padding|margin|gap|row-gap|column-gap)(?:-|$)/v;
const SPACING_STEPS = /^calc\(var\(--spacing\) \* (?<steps>-?[\d.]+)\)$/v;

function arbitraryValue(designSystem: DesignSystem, className: string) {
  const [candidate] = designSystem.parseCandidate(className);

  if (candidate?.kind === "arbitrary") {
    return { modifier: candidate.modifier, value: candidate.value };
  }

  if (candidate?.kind !== "functional" || candidate.value?.kind !== "arbitrary") {
    return;
  }

  return { modifier: candidate.modifier, value: candidate.value.value };
}

function isOffThemeRadius(properties: string[], value: string) {
  return (
    properties.some((property) => property.endsWith("radius")) &&
    LITERAL_LENGTH.test(value) &&
    (lengthPx(value) ?? 0) < PILL_RADIUS_PX
  );
}

function offThemeKind(properties: string[], value: string) {
  if (properties.some((property) => COLOR_PROPERTY.test(property)) && LITERAL_COLOR.test(value)) {
    return "color";
  }

  if (isOffThemeRadius(properties, value)) {
    return "radius";
  }

  if (properties.includes("font-family")) {
    return "font family";
  }

  return properties.includes("font-size") && LITERAL_LENGTH.test(value) ? "font size" : undefined;
}

function findOffTheme(designSystem: DesignSystem, { className, declarations }: Entry) {
  const arbitrary = arbitraryValue(designSystem, className);

  if (arbitrary === undefined || THEME_REFERENCE.test(arbitrary.value)) {
    return [];
  }

  const kind = offThemeKind([...declarations.keys()], arbitrary.value);
  const px = lengthPx(arbitrary.value);
  const size = namedLengths(designSystem, "--text").find((entry) => entry.px === px);

  if (kind !== "font size" || size === undefined) {
    return kind === undefined ? [] : [finding(className, "offTheme", { kind })];
  }

  return arbitrary.modifier === null ? [finding(className, "themeSize", { size: size.name })] : [];
}

function spacingPx(designSystem: DesignSystem, value: string | undefined) {
  const { steps } = SPACING_STEPS.exec(value ?? "")?.groups ?? {};

  if (steps === undefined) {
    return lengthPx(value);
  }

  return Number(steps) * (lengthPx(designSystem.theme.get(["--spacing"]) ?? undefined) ?? 0);
}

function findOffScaleSpacing({ designSystem, entries }: Scope) {
  return entries.flatMap(({ className, declarations }) => {
    const spacing = [...declarations].find(([property]) => SPACING_PROPERTY.test(property));
    const px = spacingPx(designSystem, resolveValue(designSystem, spacing?.[1]));

    return px === undefined || Math.abs(px) === 1 || px % 2 === 0
      ? []
      : [finding(className, "offScaleSpacing", { px: String(px) })];
  });
}

export function findThemeTokenIssues(scope: Scope) {
  return [
    ...scope.entries.flatMap<Finding<"offTheme" | "themeSize">>((entry) =>
      findOffTheme(scope.designSystem, entry),
    ),
    ...findOffScaleSpacing(scope),
  ];
}
