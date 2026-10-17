import { definePlugin } from "@oxlint/plugins";

import { nameAfterProperty } from "./rules/code/name-after-property/rule.ts";
import { naming } from "./rules/code/naming/rule.ts";
import { noComments } from "./rules/code/no-comments/rule.ts";
import { noExplicitReturnType } from "./rules/code/no-explicit-return-type/rule.ts";
import { noForbiddenDependencies } from "./rules/code/no-forbidden-dependencies/rule.ts";
import { noSingleUseOneLiners } from "./rules/code/no-single-use-one-liners/rule.ts";
import { paddingBetweenStatements } from "./rules/code/padding-between-statements/rule.ts";
import { tailwindCanonicalClasses } from "./rules/tailwind/tailwind-canonical-classes/rule.ts";
import { tailwindContrast } from "./rules/tailwind/tailwind-contrast/rule.ts";
import { tailwindDecoration } from "./rules/tailwind/tailwind-decoration/rule.ts";
import { tailwindFocusAndReveal } from "./rules/tailwind/tailwind-focus-and-reveal/rule.ts";
import { tailwindNoConcatenatedClasses } from "./rules/tailwind/tailwind-no-concatenated-classes/rule.ts";
import { tailwindNoConflictingClasses } from "./rules/tailwind/tailwind-no-conflicting-classes/rule.ts";
import { tailwindNoIdleWillChange } from "./rules/tailwind/tailwind-no-idle-will-change/rule.ts";
import { tailwindNoUnknownClasses } from "./rules/tailwind/tailwind-no-unknown-classes/rule.ts";
import { tailwindThemeTokens } from "./rules/tailwind/tailwind-theme-tokens/rule.ts";
import { tailwindTypography } from "./rules/tailwind/tailwind-typography/rule.ts";
import { uiAutocomplete } from "./rules/ui/ui-autocomplete/rule.ts";
import { uiLandmarkNames } from "./rules/ui/ui-landmark-names/rule.ts";
import { uiMedia } from "./rules/ui/ui-media/rule.ts";
import { uiNoManualPlural } from "./rules/ui/ui-no-manual-plural/rule.ts";
import { uiNoNestedInteractive } from "./rules/ui/ui-no-nested-interactive/rule.ts";
import { uiPointerEvents } from "./rules/ui/ui-pointer-events/rule.ts";
import { uiZoomable } from "./rules/ui/ui-zoomable/rule.ts";

export default definePlugin({
  meta: { name: "cstrlcs" },
  rules: Object.fromEntries(
    Object.entries({
      nameAfterProperty,
      naming,
      noComments,
      noExplicitReturnType,
      noForbiddenDependencies,
      noSingleUseOneLiners,
      paddingBetweenStatements,
      tailwindCanonicalClasses,
      tailwindContrast,
      tailwindDecoration,
      tailwindFocusAndReveal,
      tailwindNoConcatenatedClasses,
      tailwindNoConflictingClasses,
      tailwindNoIdleWillChange,
      tailwindNoUnknownClasses,
      tailwindThemeTokens,
      tailwindTypography,
      uiAutocomplete,
      uiLandmarkNames,
      uiMedia,
      uiNoManualPlural,
      uiNoNestedInteractive,
      uiPointerEvents,
      uiZoomable,
    }).map(([name, rule]) => [
      name.replaceAll(/[A-Z]/gv, (letter) => `-${letter.toLowerCase()}`),
      rule,
    ]),
  ),
});
