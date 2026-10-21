import { RuleTester } from "oxlint/plugins-dev";

import { noComments } from "./rule.ts";

const EXPORTED_DOCS = [{ allowExportedDocs: true }];

new RuleTester().run("no-comments", noComments, {
  invalid: [
    ...[
      "// oxlint-disable-next-line no-console\nconsole.log(1);",
      "// eslint-disable-next-line no-console\nconsole.log(1);",
      "console.log(1); // oxlint-disable-line no-console",
      "// oxlint-disable-next-line no-console -- CLI output\nconsole.log(1);",
      "/* eslint-disable */\nrun();",
    ].map((code) => ({ code, errors: [{ messageId: "disableDirective" }] })),
    {
      code: "/* oxlint-disable no-console */\nconsole.log(1);\n/* oxlint-enable no-console */",
      errors: [{ messageId: "disableDirective" }, { messageId: "disableDirective" }],
    },
    {
      code: "/** Runs the task. */\n// oxlint-disable-next-line no-console\nexport function run() {}",
      errors: [{ messageId: "forbidden" }, { messageId: "disableDirective" }],
      options: EXPORTED_DOCS,
    },
    { code: "// explains\nrun();", errors: [{ messageId: "forbidden" }] },
    { code: "/* explains */\nrun();", errors: [{ messageId: "forbidden" }] },
    { code: "/** Runs the task. */\nfunction run() {}", errors: [{ messageId: "forbidden" }] },
    {
      code: "/**\n * @param value - The value.\n */\nfunction run(value) {}",
      errors: [{ messageId: "forbidden" }],
    },
    {
      code: "/** Runs the task. */\nexport function run() {}",
      errors: [{ messageId: "forbidden" }],
    },
    {
      code: "/** Runs the task. */\nexport function run() {}",
      errors: [{ messageId: "forbidden" }],
      options: [{ allowExportedDocs: false }],
    },
    {
      code: "/** Runs the task. */\nfunction run() {}",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "// Runs the task.\nexport function run() {}",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "/* Runs the task. */\nexport function run() {}",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "/** Runs the task. */\n// explains\nexport function run() {}",
      errors: [{ messageId: "forbidden" }, { messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "/** Runs the task. */\nconst run = 1;\nexport { run };",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "export function run() {\n  /** The value. */\n  const value = 1;\n  return value;\n}",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "class Task {\n  /** Runs the task. */\n  run() {}\n}\nexport { Task };",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "export class Task {\n  run() {\n    /** Runs the task. */\n    return 1;\n  }\n}",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
    {
      code: "export /** Runs the task. */ function run() {}",
      errors: [{ messageId: "forbidden" }],
      options: EXPORTED_DOCS,
    },
  ],
  valid: [
    "#!/usr/bin/env node\nrun();",
    "/*! MIT License */\nrun();",
    "// @ts-expect-error\nrun();",
    "// @ts-ignore\nrun();",
    "// @ts-check\nrun();",
    "// @ts-nocheck\nrun();",
    '/// <reference types="bun" />\nrun();',
    ...[
      "/** Runs the task. */\nexport function run() {}",
      "/**\n * Runs the task.\n */\n\nexport async function run() {}",
      "/** The limit. */\nexport const LIMIT = 1;",
      "/** The count. */\nexport let count = 0;",
      "/** A task. */\nexport class Task {}",
      "/** A task. */\nexport interface Task {}",
      "/** A task. */\nexport type Task = string;",
      "/** A state. */\nexport enum State {}",
      "/** Runs the task. */\nexport default function run() {}",
      "/** The limit. */\nexport default 1;",
      "export class Task {\n  /** The name. */\n  name = '';\n  /** Runs the task. */\n  static run() {}\n}",
      "export default class {\n  /** Runs the task. */\n  run() {}\n}",
      "export interface Task {\n  /** The name. */\n  name: string;\n  /** Runs the task. */\n  run(): void;\n}",
    ].map((code) => ({ code, filename: "index.ts", options: EXPORTED_DOCS })),
  ],
});
