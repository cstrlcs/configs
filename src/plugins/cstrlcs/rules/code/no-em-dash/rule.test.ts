import { RuleTester } from "oxlint/plugins-dev";

import { noEmDash } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "no-em-dash",
  noEmDash,
  {
    invalid: [
      {
        code: 'const caption = "Paid \u2014 thanks";',
        errors: [{ column: 16, endColumn: 31, endLine: 1, line: 1, messageId: "emDash" }],
      },
      {
        code: 'const banner = "Sale ends \u2014 hurry. Stock is low \u2014 order now.";',
        errors: [{ column: 15, line: 1, messageId: "emDash" }],
      },
      {
        code: 'const shipped = "Shipped \u2014 on its way";\nconst refunded = "Refunded \u2014 check your card";',
        errors: [
          { line: 1, messageId: "emDash" },
          { line: 2, messageId: "emDash" },
        ],
      },
      {
        code: "const hint = `Uploads resume \u2014 even offline`;",
        errors: [{ line: 1, messageId: "emDash" }],
      },
      {
        code: `const range = \`\${checkIn} \u2014 \${checkOut}\`;`,
        errors: [{ line: 1, messageId: "emDash" }],
      },
      {
        code: `const lead = \`\u2014\${author}\`;`,
        errors: [{ line: 1, messageId: "emDash" }],
      },
      {
        code: "const Empty = () => (\n  <section>\n    Nothing here \u2014 add an invoice.\n  </section>\n);",
        errors: [{ line: 2, messageId: "emDash" }],
      },
      {
        code: "const Range = () => (\n  <span>\n    {checkIn} \u2014 {checkOut}\n  </span>\n);",
        errors: [{ line: 3, messageId: "emDash" }],
      },
      {
        code: "const Byline = () => <>{author} \u2014 {date}</>;",
        errors: [{ messageId: "emDash" }],
      },
      {
        code: "const Lead = () => <cite>\u2014 {author}</cite>;",
        errors: [{ messageId: "emDash" }],
      },
      {
        code: "const Logo = () => <img alt='Acme \u2014 back to dashboard' />;",
        errors: [{ column: 28, line: 1, messageId: "emDash" }],
      },
      {
        code: "const separator = /\\s*\u2014\\s*/v;",
        errors: [{ line: 1, messageId: "emDash" }],
      },
      {
        code: "type Heading = 'Billing \u2014 overview';",
        errors: [{ line: 1, messageId: "emDash" }],
      },
    ],
    valid: [
      "// Sessions expire \u2014 renew them\nconst ttl = 3600;",
      "/* Retries \u2014 three at most */\nconst retries = 3;",
      "/*! Upload kit \u2014 Apache-2.0 */",
      "const range = 'Mon -- Fri, 9\u201317';",
      String.raw`const caption = "Paid \u2014 thanks";`,
      "const Receipt = () => <p>Paid, thanks.</p>;",
      "const missing = '\u2014';",
      'const missing = "  \u2014  ";',
      "const missing = `\u2014`;",
      "const Cell = () => <td>\u2014</td>;",
      "const Cell = () => <td> \u2014 </td>;",
      "const Cell = () => (\n  <td>\n    \u2014\n  </td>\n);",
      "const Blank = () => <>\u2014</>;",
      'const Total = () => <input placeholder="\u2014" />;',
    ],
  },
);
