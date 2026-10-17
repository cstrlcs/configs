import { RuleTester } from "oxlint/plugins-dev";

import { tailwindNoConcatenatedClasses } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-no-concatenated-classes",
  tailwindNoConcatenatedClasses,
  {
    invalid: [
      {
        code: '<div className={"p-2 bg-" + color} />;',
        errors: [{ data: { className: "bg-" }, messageId: "concatenated" }],
      },
      {
        code: `<div className={\`flex text-\${size} -mt-\${gap}\`} />;`,
        errors: [
          { data: { className: "text-" }, messageId: "concatenated" },
          { data: { className: "-mt-" }, messageId: "concatenated" },
        ],
      },
    ],
    valid: [
      `<div className={\`flex \${active} p-2\`} />;`,
      '<div className={"p-2 " + variant} />;',
      'const label = "bg-" + color;',
    ],
  },
);
