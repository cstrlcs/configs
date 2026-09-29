import { describe, it } from "node:test";
import { RuleTester } from "oxlint/plugins-dev";

import { noComments } from "./rule.ts";

RuleTester.describe = (text, method) => {
  void describe(text, method);
};

RuleTester.it = (text, method) => {
  void it(text, method);
};

new RuleTester().run("no-comments", noComments, {
  invalid: [
    { code: "// explains\nrun();", errors: [{ messageId: "forbidden" }] },
    { code: "/* explains */\nrun();", errors: [{ messageId: "forbidden" }] },
    { code: "/** Runs the task. */\nfunction run() {}", errors: [{ messageId: "forbidden" }] },
    {
      code: "/**\n * @param value - The value.\n */\nfunction run(value) {}",
      errors: [{ messageId: "forbidden" }],
    },
  ],
  valid: [
    "#!/usr/bin/env node\nrun();",
    "/*! MIT License */\nrun();",
    "// oxlint-disable-next-line no-console\nconsole.log(1);",
    "// @ts-expect-error\nrun();",
    '/// <reference types="bun" />\nrun();',
  ],
});
