import { RuleTester } from "oxlint/plugins-dev";

import { noComments } from "./rule.ts";

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
    "// eslint-disable-next-line no-console\nconsole.log(1);",
    "/* oxlint-disable no-console */\nconsole.log(1);\n/* oxlint-enable no-console */",
    "// @ts-expect-error\nrun();",
    "// @ts-ignore\nrun();",
    "// @ts-check\nrun();",
    "// @ts-nocheck\nrun();",
    '/// <reference types="bun" />\nrun();',
  ],
});
