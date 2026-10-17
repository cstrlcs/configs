import type { DesignSystems } from "./design-system.ts";

import { findCanonicalFixes } from "../tailwind-canonical-classes/analysis.ts";
import { findContrast } from "../tailwind-contrast/analysis.ts";
import { findDecoration } from "../tailwind-decoration/analysis.ts";
import { findFocusAndReveal } from "../tailwind-focus-and-reveal/analysis.ts";
import { findConflicts } from "../tailwind-no-conflicting-classes/analysis.ts";
import { findIdleWillChange } from "../tailwind-no-idle-will-change/analysis.ts";
import { findUnknownClasses } from "../tailwind-no-unknown-classes/analysis.ts";
import { findThemeTokenIssues } from "../tailwind-theme-tokens/analysis.ts";
import { findTypographyIssues } from "../tailwind-typography/analysis.ts";
import { createScope } from "./scope.ts";

export interface ClassList {
  classNames: string[];
  group: number;
}

function checkList({ designSystem }: DesignSystems, { classNames, group }: ClassList) {
  const unique = [...new Set(classNames)];
  const css = designSystem.candidatesToCss(unique);
  const known = unique.filter((_, index) => css[index] !== null);

  return { classNames: unique, group, known };
}

export function analyze(designSystems: DesignSystems, lists: ClassList[]) {
  const { designSystem } = designSystems;
  const checked = lists.map((list) => checkList(designSystems, list));
  const unknown = findUnknownClasses(checked);

  return checked.map(({ known }, index) => {
    const scope = createScope(designSystem, known);

    return {
      canonical: findCanonicalFixes(designSystems, known),
      conflicting: findConflicts(designSystem, known),
      contrast: findContrast(scope),
      decoration: findDecoration(scope),
      focusAndReveal: findFocusAndReveal(scope),
      themeTokens: findThemeTokenIssues(scope),
      typography: findTypographyIssues(scope),
      unknown: unknown[index] ?? [],
      willChange: findIdleWillChange(scope),
    };
  });
}

export type Analysis = ReturnType<typeof analyze>[number];
