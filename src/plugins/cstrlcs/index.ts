import { definePlugin } from "@oxlint/plugins";

import { nameAfterProperty } from "./rules/code/name-after-property/rule.ts";
import { naming } from "./rules/code/naming/rule.ts";
import { noComments } from "./rules/code/no-comments/rule.ts";
import { noDeprecatedNodeApis } from "./rules/code/no-deprecated-node-apis/rule.ts";
import { noDuplicatedLogic } from "./rules/code/no-duplicated-logic/rule.ts";
import { noEmDash } from "./rules/code/no-em-dash/rule.ts";
import { noExplicitReturnType } from "./rules/code/no-explicit-return-type/rule.ts";
import { noExportAssignment } from "./rules/code/no-export-assignment/rule.ts";
import { noForbiddenDependencies } from "./rules/code/no-forbidden-dependencies/rule.ts";
import { noInvariantReturns } from "./rules/code/no-invariant-returns/rule.ts";
import { noRedundantLogic } from "./rules/code/no-redundant-logic/rule.ts";
import { noRestrictedModulePaths } from "./rules/code/no-restricted-module-paths/rule.ts";
import { noTrivialFunctions } from "./rules/code/no-trivial-functions/rule.ts";
import { noTrivialTypeAliases } from "./rules/code/no-trivial-type-aliases/rule.ts";
import { noUselessCollections } from "./rules/code/no-useless-collections/rule.ts";
import { paddingBetweenStatements } from "./rules/code/padding-between-statements/rule.ts";
import { preferModernApis } from "./rules/code/prefer-modern-apis/rule.ts";
import { sortSpecifiers } from "./rules/code/sort-specifiers/rule.ts";
import { reactNaming } from "./rules/react/react-naming/rule.ts";
import { reactNoLeakedEffects } from "./rules/react/react-no-leaked-effects/rule.ts";
import { reactNoLeakedText } from "./rules/react/react-no-leaked-text/rule.ts";
import { reactNoLegacyApis } from "./rules/react/react-no-legacy-apis/rule.ts";
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
      noDeprecatedNodeApis,
      noDuplicatedLogic,
      noEmDash,
      noExplicitReturnType,
      noExportAssignment,
      noForbiddenDependencies,
      noInvariantReturns,
      noRedundantLogic,
      noRestrictedModulePaths,
      noTrivialFunctions,
      noTrivialTypeAliases,
      noUselessCollections,
      paddingBetweenStatements,
      preferModernApis,
      reactNaming,
      reactNoLeakedEffects,
      reactNoLeakedText,
      reactNoLegacyApis,
      sortSpecifiers,
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
