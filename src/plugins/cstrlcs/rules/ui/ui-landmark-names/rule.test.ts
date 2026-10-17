import { RuleTester } from "oxlint/plugins-dev";

import { uiLandmarkNames } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "ui-landmark-names",
  uiLandmarkNames,
  {
    invalid: [
      {
        code: '<div aria-label="Status">Ready</div>;',
        errors: [{ data: { element: "div" }, messageId: "namedGeneric" }],
      },
      {
        code: "<section><h2>Plans</h2></section>;",
        errors: [{ messageId: "unnamedSection" }],
      },
      {
        code: '<><nav aria-label="Main" /><nav /></>;',
        errors: [{ messageId: "unnamedNav" }],
      },
      { code: "<><nav {...props} /><nav /></>;", errors: [{ messageId: "unnamedNav" }] },
      {
        code: '<span aria-labelledby="status" />;',
        errors: [{ data: { element: "span" }, messageId: "namedGeneric" }],
      },
    ],
    valid: [
      '<div role="group" aria-label="Filters" />;',
      '<div {...props} aria-label="Filters" />;',
      '<section aria-labelledby="plans-title"><h2 id="plans-title">Plans</h2></section>;',
      "<section {...props} />;",
      "<nav />;",
    ],
  },
);
