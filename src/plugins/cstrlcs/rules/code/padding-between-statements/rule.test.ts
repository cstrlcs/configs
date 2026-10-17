import { RuleTester } from "oxlint/plugins-dev";

import { paddingBetweenStatements } from "./rule.ts";

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
      code: `const a = 1;

const b = 2;


const c = 3;`,
      errors: [{ messageId: "unexpected" }, { messageId: "unexpected" }],
      output: `const a = 1;
const b = 2;
const c = 3;`,
    },
    {
      code: `function run() {
  const a = 1;

  const b = 2;

  start();

  stop();

  return a;
}`,
      errors: [{ messageId: "unexpected" }, { messageId: "unexpected" }],
      output: `function run() {
  const a = 1;
  const b = 2;

  start();
  stop();

  return a;
}`,
    },
    {
      code: `export const a = 1;

export const b = 2;
const options = {
  a: 1,
};

const c = 3;`,
      errors: [{ messageId: "unexpected" }, { messageId: "missing" }],
      output: `export const a = 1;
export const b = 2;

const options = {
  a: 1,
};

const c = 3;`,
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
    `import a from "a";

import b from "./b";`,
    `const a = 1;

// a comment
const b = 2;`,
  ],
});
