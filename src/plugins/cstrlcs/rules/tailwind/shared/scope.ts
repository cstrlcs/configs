import type { DesignSystem } from "./design-system.ts";

import { declarationsOf, resolveValue, splitVariants } from "./css.ts";

export interface Entry {
  className: string;
  declarations: Map<string, string>;
  prefix: string;
}

export interface Scope {
  designSystem: DesignSystem;
  entries: Entry[];
}

export function createScope(designSystem: DesignSystem, classNames: string[]) {
  const entries = classNames.map((className) => ({
    className,
    declarations: declarationsOf(designSystem, className),
    prefix: splitVariants(className).variants.join(":"),
  }));

  return { designSystem, entries } satisfies Scope;
}

export function declaringEntry({ entries }: Scope, property: string, prefix: string) {
  const scoped = entries.find(
    (entry) => entry.prefix === prefix && entry.declarations.has(property),
  );

  return scoped ?? entries.find((entry) => entry.prefix === "" && entry.declarations.has(property));
}

export function valueIn(scope: Scope, property: string, prefix: string) {
  return resolveValue(
    scope.designSystem,
    declaringEntry(scope, property, prefix)?.declarations.get(property),
  );
}
