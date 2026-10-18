import { RuleTester } from "oxlint/plugins-dev";

import { reactNoLeakedText } from "./rule.ts";

function dollar(output: string) {
  return { messageId: "leakedDollar", suggestions: [{ messageId: "removeDollar", output }] };
}

function semicolon(output: string) {
  return {
    messageId: "leakedSemicolon",
    suggestions: [{ messageId: "removeSemicolons", output }],
  };
}

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "react-no-leaked-text",
  reactNoLeakedText,
  {
    invalid: [
      {
        code: `const a = <>Hello \${user.name}</>;`,
        errors: [
          {
            column: 18,
            endColumn: 19,
            endLine: 1,
            line: 1,
            ...dollar("const a = <>Hello {user.name}</>;"),
          },
        ],
      },
      {
        code: `const App = (props) => <div>\${props.name} is your name</div>;`,
        errors: [dollar("const App = (props) => <div>{props.name} is your name</div>;")],
      },
      {
        code: `const App = (props) => <div>Hello \${props.name} is your name</div>;`,
        errors: [dollar("const App = (props) => <div>Hello {props.name} is your name</div>;")],
      },
      {
        code: `const a = <div>Progress: \${count} / \${total}</div>;`,
        errors: [
          dollar(`const a = <div>Progress: {count} / \${total}</div>;`),
          dollar(`const a = <div>Progress: \${count} / {total}</div>;`),
        ],
      },
      {
        code: `const a = <div>Price: \${value}</div>;`,
        errors: [dollar("const a = <div>Price: {value}</div>;")],
      },
      {
        code: `const a = <>Hello $\${user.name}</>;`,
        errors: [{ column: 19, endColumn: 20, ...dollar(`const a = <>Hello \${user.name}</>;`) }],
      },
      {
        code: `const a = <>$\${user.name}</>;`,
        errors: [dollar(`const a = <>\${user.name}</>;`)],
      },
      {
        code: `const a = <div>Price: $$$\${value}</div>;`,
        errors: [dollar(`const a = <div>Price: $$\${value}</div>;`)],
      },
      {
        code: `const a = <div>\${a}{b}</div>;`,
        errors: [dollar("const a = <div>{a}{b}</div>;")],
      },
      {
        code: `const a = <div>Hello {world} \${price}</div>;`,
        errors: [dollar("const a = <div>Hello {world} {price}</div>;")],
      },
      {
        code: `const a = <div>{a}\${b}</div>;`,
        errors: [dollar("const a = <div>{a}{b}</div>;")],
      },
      {
        code: `const a = <div><span>Hello \${user}</span></div>;`,
        errors: [dollar("const a = <div><span>Hello {user}</span></div>;")],
      },
      {
        code: `const a = <div>Hello \${<span>world</span>}</div>;`,
        errors: [dollar("const a = <div>Hello {<span>world</span>}</div>;")],
      },
      {
        code: `const a = <div>Hello\n\${expr}</div>;`,
        errors: [dollar("const a = <div>Hello\n{expr}</div>;")],
      },
      {
        code: `const a = <div>{cond ? a : b}\${y}</div>;`,
        errors: [dollar("const a = <div>{cond ? a : b}{y}</div>;")],
      },
      {
        code: `const a = <div>\${/* c */}{a}</div>;`,
        errors: [dollar("const a = <div>{/* c */}{a}</div>;")],
      },
      {
        code: "const a = (\n  <div>\n    <div />;\n  </div>\n);",
        errors: [
          {
            column: 11,
            endColumn: 12,
            line: 3,
            ...semicolon("const a = (\n  <div>\n    <div />\n  </div>\n);"),
          },
        ],
      },
      {
        code: "const a = (\n  <div>\n    <Component>\n      <div />\n    </Component>;\n  </div>\n);",
        errors: [
          semicolon(
            "const a = (\n  <div>\n    <Component>\n      <div />\n    </Component>\n  </div>\n);",
          ),
        ],
      },
      {
        code: "const a = (\n  <>\n    <div />;\n  </>\n);",
        errors: [semicolon("const a = (\n  <>\n    <div />\n  </>\n);")],
      },
      {
        code: "const App = () => (\n  <div>\n    <Component />;\n  </div>\n);",
        errors: [semicolon("const App = () => (\n  <div>\n    <Component />\n  </div>\n);")],
      },
      {
        code: "const a = (\n  <div>\n    <div />;\n    text\n  </div>\n);",
        errors: [semicolon("const a = (\n  <div>\n    <div />\n    text\n  </div>\n);")],
      },
      {
        code: "const a = (\n  <div>\n    <span>\n      <div />;\n    </span>\n  </div>\n);",
        errors: [
          semicolon("const a = (\n  <div>\n    <span>\n      <div />\n    </span>\n  </div>\n);"),
        ],
      },
      {
        code: "const a = (\n  <div>\n    <span>;\n    </span>\n  </div>\n);",
        errors: [semicolon("const a = (\n  <div>\n    <span>\n    </span>\n  </div>\n);")],
      },
      {
        code: "const a = <div><span />;  \n</div>;",
        errors: [semicolon("const a = <div><span />  \n</div>;")],
      },
      {
        code: "const a = <div><span />;\t\n</div>;",
        errors: [semicolon("const a = <div><span />\t\n</div>;")],
      },
      {
        code: "const a = <div><span />;\n</div>;",
        errors: [semicolon("const a = <div><span />\n</div>;")],
      },
      {
        code: "const a = <div><span />;\r\n</div>;",
        errors: [semicolon("const a = <div><span />\r\n</div>;")],
      },
      {
        code: "const a = (\n  <div>\n    <div />;;\n  </div>\n);",
        errors: [semicolon("const a = (\n  <div>\n    <div />\n  </div>\n);")],
      },
    ],
    valid: [
      "const a = <div>Hello {props.name}</div>;",
      `const a = \`Hello \${user.name}\`;`,
      `const a = <div>{\`$\${price}\`}</div>;`,
      "const a = <div>Hello $</div>;",
      `const a = <div>\${price}</div>;`,
      `const a = <div>\${price} </div>;`,
      `const a = <div> \${price}</div>;`,
      `const a = (\n  <div>\n    \${price}\n  </div>\n);`,
      `const a = <div>\${price}{}</div>;`,
      `const a = <div>\${price}{""}</div>;`,
      `const a = <div>\${price}{/* c */}</div>;`,
      `const a = <div>\${...items}</div>;`,
      "const a = <div>$<span>text</span></div>;",
      `const a = <>\${price}</>;`,
      `const a = <div>\${}</div>;`,
      "const a = <div>$ {expr}</div>;",
      "const a = <div>Hello $world</div>;",
      "const a = <div>$text{expr}</div>;",
      "const a = <div>  $  {expr}</div>;",
      "const a = <div>Hello $\t{expr}</div>;",
      "const a = <div>Price: &dollar;{value}</div>;",
      "const a = <div>Price: &#36;{value}</div>;",
      "const a = <div>Price: &#x24;{value}</div>;",
      "const a = <div>Price: &#36;&#36;{value}</div>;",
      "const a = <div>{a}&#36;{b}</div>;",
      `const a = <div attr="Price: \${value}" />;`,
      "const a = (\n  <div>\n    <div />\n  </div>\n);",
      "const a = (\n  <div>\n    <div />\n    ;\n  </div>\n);",
      "const a = (\n  <div>\n    <div />{';'}\n  </div>\n);",
      "const a = (\n  <div>\n    <div />&#59;\n  </div>\n);",
      "const a = (\n  <div>\n    <div />&#59;  \n  </div>\n);",
      "const a = (\n  <div>\n    <div />&semi;\n  </div>\n);",
      "const App = () => {\n  return <div />;\n};",
      "const a = (\n  <div>\n    <span>;</span>\n    <span />;<span />\n    text; text;\n    &amp;\n  </div>\n);",
      "const a = (\n  <div>\n    <div />text;\n  </div>\n);",
      "const a = <div>;<span /></div>;",
      "const a = <div><div />;</div>;",
      "const a = (\n  <div>\n     ;\n  </div>\n);",
      "const a = (\n  <div>\n    text;\n  </div>\n);",
      "const a = <div><span>;</span></div>;",
      "const a = <div attr='a;b' />;",
    ],
  },
);
