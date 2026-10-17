import { RuleTester } from "oxlint/plugins-dev";

import { uiAutocomplete } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "ui-autocomplete",
  uiAutocomplete,
  {
    invalid: [
      {
        code: '<input name="email" />;',
        errors: [{ messageId: "missingAutocomplete" }],
      },
      {
        code: '<input type="password" />;',
        errors: [{ messageId: "missingAutocomplete" }],
      },
      {
        code: '<input type="tel" />;',
        errors: [{ messageId: "missingAutocomplete" }],
      },
      {
        code: '<input name="firstName" />;',
        errors: [{ messageId: "missingAutocomplete" }],
      },
      {
        code: '<input name="name" />;',
        errors: [{ messageId: "missingAutocomplete" }],
      },
      { code: '<input name="phone" />;', errors: [{ messageId: "missingAutocomplete" }] },
      { code: '<input name="postal-code" />;', errors: [{ messageId: "missingAutocomplete" }] },
      { code: '<input name="e-mail" />;', errors: [{ messageId: "missingAutocomplete" }] },
    ],
    valid: [
      '<input type="email" autoComplete="email" />;',
      '<input {...field} type="email" />;',
      '<input type="hidden" name="email" />;',
      '<input name="filename" />;',
      '<select name="country" />;',
    ],
  },
);
