import { describe, it } from "node:test";
import { RuleTester } from "oxlint/plugins-dev";

import { paddingBetweenStatements } from "./rule.ts";

RuleTester.describe = (text, method) => {
  void describe(text, method);
};

RuleTester.it = (text, method) => {
  void it(text, method);
};

new RuleTester().run("padding-between-statements", paddingBetweenStatements, {
  invalid: [
    {
      code: `function run() {
  const x = 42;
  if (x === 42) {
    console.log("x is 42");
  } else {
    console.log("x is not 42");
  }
  if (x !== 42) {
    console.log("x is not 42");
  }
  const y = 43;
  const z = 44;
  return x;
}`,
      errors: [
        { messageId: "missing" },
        { messageId: "missing" },
        { messageId: "missing" },
        { messageId: "missing" },
      ],
      output: `function run() {
  const x = 42;

  if (x === 42) {
    console.log("x is 42");
  } else {
    console.log("x is not 42");
  }

  if (x !== 42) {
    console.log("x is not 42");
  }

  const y = 43;
  const z = 44;

  return x;
}`,
    },
    {
      code: `const options = {
  a: 1,
};
const b = 2;`,
      errors: [{ messageId: "missing" }],
      output: `const options = {
  a: 1,
};

const b = 2;`,
    },
    {
      code: `import a from "a";
const b = a;`,
      errors: [{ messageId: "missing" }],
      output: `import a from "a";

const b = a;`,
    },
    {
      code: `switch (value) {
  case 1:
    run();
    break;
}`,
      errors: [{ messageId: "missing" }],
      output: `switch (value) {
  case 1:
    run();

    break;
}`,
    },
    {
      code: `if (a) { run(); }
if (b) { stop(); }
function first() {}
function second() {}`,
      errors: [{ messageId: "missing" }, { messageId: "missing" }, { messageId: "missing" }],
      output: `if (a) { run(); }

if (b) { stop(); }

function first() {}

function second() {}`,
    },
    {
      code: `export function first() {}
export function second() {}`,
      errors: [{ messageId: "missing" }],
      output: `export function first() {}

export function second() {}`,
    },
    {
      code: "const a = 1; run();",
      errors: [{ messageId: "missing" }],
      output: null,
    },
  ],
  valid: [
    `const a = 1;
const b = 2;

run();
stop();

return a;`,
    `import {
  a,
} from "a";
import b from "b";`,
    `const a = 1;
// a comment

run();`,
    `function run() {
  return 1;
}`,
  ],
});
