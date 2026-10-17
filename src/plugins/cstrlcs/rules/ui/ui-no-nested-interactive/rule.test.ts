import { RuleTester } from "oxlint/plugins-dev";

import { uiNoNestedInteractive } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "ui-no-nested-interactive",
  uiNoNestedInteractive,
  {
    invalid: [
      {
        code: '<a href="/plans"><button type="button">Plans</button></a>;',
        errors: [{ data: { element: "button" }, messageId: "nestedInteractive" }],
      },
      {
        code: '<a href="/"><span><button>Plans</button></span></a>;',
        errors: [{ messageId: "nestedInteractive" }],
      },
      {
        code: "<button><select /></button>;",
        errors: [{ data: { element: "select" }, messageId: "nestedInteractive" }],
      },
    ],
    valid: [
      '<label><input type="checkbox" /> Remember me</label>;',
      '<a href="/plans"><span>Plans</span></a>;',
      '<a href="/plans"><input type="hidden" name="plan" value="pro" /></a>;',
      "<a><button>Plans</button></a>;",
    ],
  },
);
