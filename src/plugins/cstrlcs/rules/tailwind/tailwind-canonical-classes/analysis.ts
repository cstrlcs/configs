import type { DesignSystem, DesignSystems } from "../shared/design-system.ts";
import type { Finding } from "../shared/finding.ts";

import {
  declarationsOf,
  lengthPx,
  namedLengths,
  PILL_RADIUS_PX,
  ROOT_FONT_SIZE_PX,
  splitVariants,
} from "../shared/css.ts";

const CANONICAL_OPTIONS = { collapse: true, logicalToPhysical: true, rem: ROOT_FONT_SIZE_PX };
const UTILITY = /^(?<sign>-?!?)(?<core>.+?)(?<important>!?)$/v;
const ARBITRARY_BREAKPOINT = /^(?<side>min|max)-\[(?<width>[\d.]+(?:px|rem))\]$/v;

const LEGACY_SIZELESS_UTILITIES = new Set([
  "shadow",
  "blur",
  "backdrop-blur",
  "rounded",
  "rounded-t",
  "rounded-b",
  "rounded-s",
  "rounded-e",
  "rounded-ss",
  "rounded-se",
  "rounded-es",
  "rounded-ee",
  "rounded-l",
  "rounded-r",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
]);

const variantRanks = new WeakMap<DesignSystem, Map<string, number>>();
const breakpointCache = new WeakMap<DesignSystem, Map<string, number | undefined>>();

function isKnown(designSystem: DesignSystem, className: string) {
  return designSystem.candidatesToCss([className])[0] !== null;
}

function propertyKey(designSystem: DesignSystem, className: string) {
  return [...declarationsOf(designSystem, className).keys()]
    .filter((property) => !property.startsWith("--tw-"))
    .toSorted()
    .join(" ");
}

function measureBreakpoint(designSystem: DesignSystem, variant: string) {
  if (variant === "") {
    return 0;
  }

  const css = designSystem.candidatesToCss([`${variant}:block`])[0] ?? "";
  const queries = [...css.matchAll(/@media \(width >= (?<width>[\d.]+(?:px|rem))\)/gv)];
  const { width } = queries[0]?.groups ?? {};

  if (queries.length !== 1 || css.split("@").length !== 2) {
    return;
  }

  return lengthPx(width);
}

function breakpointPx(designSystem: DesignSystem, prefix: string) {
  const cache = breakpointCache.get(designSystem) ?? new Map<string, number | undefined>();

  if (!cache.has(prefix)) {
    cache.set(prefix, prefix.includes(":") ? undefined : measureBreakpoint(designSystem, prefix));
    breakpointCache.set(designSystem, cache);
  }

  return cache.get(prefix);
}

function canonicalize(designSystem: DesignSystem, classNames: string[]) {
  return designSystem.canonicalizeCandidates(classNames, CANONICAL_OPTIONS);
}

function isCoreUtility(baseline: DesignSystem, className: string) {
  return baseline.parseCandidate(splitVariants(className).utility).length > 0;
}

function findCanonicalGroups(designSystem: DesignSystem, classNames: string[]) {
  const output = new Set(canonicalize(designSystem, classNames));
  const removed = classNames.filter((className) => !output.has(className));

  const withoutEach = removed.map(
    (className) =>
      new Set(
        canonicalize(
          designSystem,
          removed.filter((other) => other !== className),
        ),
      ),
  );

  const groups = [...output]
    .filter((replacement) => !classNames.includes(replacement))
    .map((replacement) => ({
      classNames: removed.filter((_, index) => withoutEach[index]?.has(replacement) !== true),
      replacement,
    }))
    .filter((group) => group.classNames.length > 0);

  return { groups, output };
}

function overrides(designSystem: DesignSystem, cover: string, className: string) {
  const coverDeclarations = declarationsOf(designSystem, cover);

  return (
    propertyKey(designSystem, cover) === propertyKey(designSystem, className) &&
    [...declarationsOf(designSystem, className)].some(
      ([property, value]) => coverDeclarations.get(property) !== value,
    )
  );
}

function covers({ baseline, designSystem }: DesignSystems, cover: string, className: string) {
  const system = isKnown(baseline, cover) && isKnown(baseline, className) ? baseline : designSystem;

  return (
    canonicalize(system, [cover, className]).join(" ") === cover &&
    !overrides(designSystem, cover, className)
  );
}

function findCoveredClasses(designSystems: DesignSystems, classNames: string[]) {
  const { baseline, designSystem } = designSystems;
  const { groups, output } = findCanonicalGroups(designSystem, classNames);
  const kept = groups.filter((group) => isCoreUtility(baseline, group.replacement));
  const settled = new Set(kept.flatMap((group) => group.classNames));

  const candidates = classNames.filter(
    (className) => !settled.has(className) && !output.has(className),
  );

  const remaining = [...output].filter((className) => isCoreUtility(baseline, className));
  const pool = [...remaining, ...candidates];

  const covered = candidates.flatMap((className) => {
    const cover = pool.find(
      (other) => other !== className && covers(designSystems, other, className),
    );

    return cover === undefined ? [] : [{ className, cover }];
  });

  return { covered, groups: kept };
}

function describeScope(designSystem: DesignSystem, className: string) {
  const { utility, variants } = splitVariants(className);
  const prefix = variants.join(":");

  return {
    className,
    key: propertyKey(designSystem, className),
    utility,
    width: breakpointPx(designSystem, prefix),
  };
}

function findResponsiveRepeats(designSystem: DesignSystem, classNames: string[]) {
  const scopes = classNames.map((className) => describeScope(designSystem, className));

  return scopes.flatMap((scope) => {
    const others = scopes.filter((other) => other !== scope && other.key === scope.key);

    if (
      scope.width === undefined ||
      scope.width === 0 ||
      others.some((other) => other.width === undefined)
    ) {
      return [];
    }

    const { width } = scope;

    const [nearest] = others
      .filter((other) => (other.width ?? 0) < width)
      .toSorted((left, right) => (right.width ?? 0) - (left.width ?? 0));

    return nearest?.utility === scope.utility
      ? [{ className: scope.className, cover: nearest.className }]
      : [];
  });
}

function toSized(className: string) {
  const { utility, variants } = splitVariants(className);
  const { core, important = "", sign = "" } = UTILITY.exec(utility)?.groups ?? {};

  if (core === undefined || !LEGACY_SIZELESS_UTILITIES.has(core)) {
    return;
  }

  return [...variants, `${sign}${core}-sm${important}`].join(":");
}

function toNamedBreakpoints(designSystem: DesignSystem, className: string) {
  const breakpoints = namedLengths(designSystem, "--breakpoint");
  const { utility, variants } = splitVariants(className);

  const named = variants.map((variant) => {
    const { side, width } = ARBITRARY_BREAKPOINT.exec(variant)?.groups ?? {};
    const breakpoint = breakpoints.find(({ px }) => px === lengthPx(width));

    if (breakpoint === undefined) {
      return variant;
    }

    return side === "max" ? `max-${breakpoint.name}` : breakpoint.name;
  });

  return [...named, utility].join(":");
}

function themeValueName(
  designSystem: DesignSystem,
  { modifier, root, value }: { modifier: unknown; root: string; value: string },
) {
  const px = lengthPx(value);

  if (root.startsWith("rounded") && (px ?? 0) >= PILL_RADIUS_PX) {
    return "full";
  }

  if (root !== "text" || modifier === null) {
    return;
  }

  return namedLengths(designSystem, "--text").find((entry) => entry.px === px)?.name;
}

function toThemeValue(designSystem: DesignSystem, className: string) {
  const [candidate] = designSystem.parseCandidate(className);

  if (candidate?.kind !== "functional" || candidate.value?.kind !== "arbitrary") {
    return;
  }

  const { value } = candidate.value;

  const name = themeValueName(designSystem, {
    modifier: candidate.modifier,
    root: candidate.root,
    value,
  });

  return name === undefined ? undefined : className.replace(`[${value}]`, name);
}

function rankVariants(designSystem: DesignSystem) {
  const cached = variantRanks.get(designSystem);

  if (cached !== undefined) {
    return cached;
  }

  const globals = new Set(
    designSystem
      .getVariants()
      .filter(({ selectors }) => {
        const resolved = selectors({});

        return resolved.length > 0 && resolved.every((selector) => !selector.includes("&"));
      })
      .map(({ name }) => name),
  );

  const ranks = new Map(
    [...designSystem.getVariantOrder()]
      .map(([variant, order]) => [designSystem.printVariant(variant), order] as const)
      .filter(([name]) => globals.has(name))
      .map(([name, order]) => [name, order + 1]),
  );

  variantRanks.set(designSystem, ranks);

  return ranks;
}

function sortVariants(designSystem: DesignSystem, className: string) {
  const ranks = rankVariants(designSystem);
  const { utility, variants } = splitVariants(className);
  const fixed = Number(variants[0] === designSystem.theme.prefix);
  const movable = variants.slice(fixed);

  if (
    movable.length < 2 ||
    movable.some((variant) => designSystem.parseVariant(variant) === null)
  ) {
    return;
  }

  function rank(variant: string) {
    return ranks.get(variant) ?? 0;
  }

  const sorted = movable.toSorted((left, right) => rank(right) - rank(left));

  return [...variants.slice(0, fixed), ...sorted, utility].join(":");
}

function normalize(designSystem: DesignSystem, className: string) {
  const steps = [
    toSized,
    (current: string) => toNamedBreakpoints(designSystem, current),
    (current: string) => toThemeValue(designSystem, current),
    (current: string) => sortVariants(designSystem, current),
  ];

  let current = className;

  for (const step of steps) {
    const next = step(current);

    if (next !== undefined && isKnown(designSystem, next)) {
      current = next;
    }
  }

  return current;
}

export function findCanonicalFixes(
  { baseline, designSystem }: DesignSystems,
  classNames: string[],
) {
  const { covered, groups } = findCoveredClasses({ baseline, designSystem }, classNames);
  const redundant = [...covered, ...findResponsiveRepeats(designSystem, classNames)];

  const settled = new Set([
    ...groups.flatMap((group) => group.classNames),
    ...redundant.map(({ className }) => className),
  ]);

  const singles = classNames
    .filter((className) => !settled.has(className))
    .map((className) => ({ classNames: [className], replacement: className }));

  const canonical = [...groups, ...singles]
    .map((group) => ({
      classNames: group.classNames,
      replacement: normalize(designSystem, group.replacement),
    }))
    .filter((group) => group.classNames.join(" ") !== group.replacement)
    .map(
      ({ classNames: grouped, replacement }) =>
        ({
          classNames: grouped,
          data: { classNames: grouped.join(" "), replacement },
          messageId: "canonical",
          replacement,
        }) satisfies Finding<"canonical">,
    );

  const removals = [...new Map(redundant.map((entry) => [entry.className, entry])).values()].map(
    ({ className, cover }) =>
      ({
        classNames: [className],
        data: { className, cover },
        messageId: "redundant",
        removes: true,
      }) satisfies Finding<"redundant">,
  );

  return [...canonical, ...removals];
}
