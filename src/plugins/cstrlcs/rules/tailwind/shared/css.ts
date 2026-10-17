import type { AstNode, DesignSystem } from "./design-system.ts";

export const ROOT_FONT_SIZE_PX = 16;
export const PILL_RADIUS_PX = 9999;

const declarationCache = new WeakMap<DesignSystem, Map<string, Map<string, string>>>();

export function splitVariants(className: string) {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;

  for (const { 0: character, index } of className.matchAll(/[\[\]\(\):]/gv)) {
    if (character === "[" || character === "(") {
      depth += 1;
    } else if (character === "]" || character === ")") {
      depth -= 1;
    } else if (depth === 0) {
      variants.push(className.slice(start, index));
      start = index + 1;
    }
  }

  return { utility: className.slice(start), variants };
}

function isPropertyRegistration(node: AstNode) {
  return node.kind === "at-rule" && node.name === "@property";
}

function collectDeclarations(nodes: AstNode[], declarations: Map<string, string>) {
  for (const node of nodes) {
    if (node.kind === "declaration" && node.value !== undefined) {
      declarations.set(node.property, node.value);
    } else if (
      node.kind !== "declaration" &&
      node.kind !== "comment" &&
      !isPropertyRegistration(node)
    ) {
      collectDeclarations(node.nodes, declarations);
    }
  }
}

export function declarationsOf(designSystem: DesignSystem, className: string) {
  const cache = declarationCache.get(designSystem) ?? new Map<string, Map<string, string>>();
  const cached = cache.get(className);

  if (cached !== undefined) {
    return cached;
  }

  const declarations = new Map<string, string>();

  collectDeclarations(designSystem.candidatesToAst([className])[0] ?? [], declarations);
  cache.set(className, declarations);
  declarationCache.set(designSystem, cache);

  return declarations;
}

export function lengthPx(value: string | undefined) {
  const { amount, unit } =
    /^(?<amount>-?[\d.]+)(?<unit>px|rem)$/v.exec(value?.trim() ?? "")?.groups ?? {};

  if (amount === undefined) {
    return;
  }

  return Number(amount) * (unit === "rem" ? ROOT_FONT_SIZE_PX : 1);
}

export function namedLengths(designSystem: DesignSystem, namespace: string) {
  return [...designSystem.theme.namespace(namespace)].flatMap(([name, value]) => {
    const px = lengthPx(value);

    return name === null || name.includes("--") || px === undefined ? [] : [{ name, px }];
  });
}

function resolveReference(designSystem: DesignSystem, value: string) {
  const { fallback, name } =
    /^var\(--(?<name>[\w\-]+)(?:,\s*(?<fallback>.+))?\)$/v.exec(value)?.groups ?? {};

  if (name === undefined) {
    return { resolved: true, value };
  }

  return { resolved: false, value: (designSystem.theme.get([`--${name}`]) ?? fallback)?.trim() };
}

function negate(value: string | undefined) {
  if (value === undefined) {
    return;
  }

  return value.startsWith("-") ? value.slice(1) : `-${value}`;
}

function resolveChain(designSystem: DesignSystem, value: string | undefined) {
  let current = value?.trim();

  for (let depth = 0; depth < 8 && current !== undefined; depth += 1) {
    const step = resolveReference(designSystem, current);

    if (step.resolved) {
      return step.value;
    }

    current = step.value;
  }

  return current;
}

export function resolveValue(designSystem: DesignSystem, value: string | undefined) {
  const { negated } = /^calc\((?<negated>.+) \* -1\)$/v.exec(value?.trim() ?? "")?.groups ?? {};

  if (negated === undefined) {
    return resolveChain(designSystem, value);
  }

  return negate(resolveChain(designSystem, negated));
}
