import { RuleTester } from "oxlint/plugins-dev";

import { noEnvAccess } from "./rule.ts";

const ENV_READS = [
  "const port = process.env.PORT;",
  'const port = process.env["PORT"];',
  'const port = process["env"].PORT;',
  "const port = process?.env.PORT;",
  'import process from "node:process";\nconst port = process.env.PORT;',
  'import proc from "process";\nconst port = proc.env.PORT;',
  'import * as nodeProcess from "node:process";\nconst port = nodeProcess.env.PORT;',
  'import { default as proc } from "node:process";\nconst port = proc.env.PORT;',
  "const { env } = process;",
  "const { env: environment } = process;",
  'import process from "node:process";\nconst { env } = process;',
  "const token = Bun.env.TOKEN;",
  "const { env } = Bun;",
  "const apiUrl = import.meta.env.VITE_API_URL;",
  "const { env } = import.meta;",
  'import { env } from "node:process";',
  'import { env as environment } from "process";',
  'export { env } from "node:process";',
];

new RuleTester().run("no-env-access", noEnvAccess, {
  invalid: [
    ...ENV_READS.map((code) => ({ code, errors: [{ messageId: "envAccess" }] })),
    {
      code: "const port = process.env.PORT;",
      errors: [
        {
          message:
            "Read the environment through the project's env.ts module, which parses it once with a schema.",
        },
      ],
      filename: "src/server/environment.ts",
    },
    {
      code: 'import { argv, env } from "node:process";\nconst { NODE_ENV } = env;',
      errors: [{ column: 15, line: 1, messageId: "envAccess" }],
    },
    {
      code: "const host = process.env.HOST;\nconst token = Bun.env.TOKEN;",
      errors: [{ messageId: "envAccess" }, { messageId: "envAccess" }],
    },
    {
      code: "const port = process.env.PORT;",
      filename: "src/env/index.ts",
      errors: [{ messageId: "envAccess" }],
    },
    {
      code: "const port = process.env.PORT;",
      filename: "src/testing.ts",
      errors: [{ messageId: "envAccess" }],
    },
  ],
  valid: [
    "const args = process.argv;",
    'import process from "node:process";\nprocess.exit(1);',
    'import { argv } from "node:process";',
    "const { argv } = process;",
    "const url = import.meta.url;",
    "const file = Bun.file('data.json');",
    "const env = loadEnv();\nconst port = env.PORT;",
    "const process = createWorker();\nconst port = process.env.PORT;",
    "function start(process) {\n  return process.env.PORT;\n}",
    'import { process } from "./worker";\nconst port = process.env.PORT;',
    'import { env } from "./env.ts";\nconst port = env.PORT;',
    "const config = { env: 'production' };\nconst mode = config.env;",
    "const key = 'env';\nconst value = process[key];",
    ...["env.ts", "env.js", "env.mts", "env.cts", "env.mjs", "env.cjs", "src/config/env.ts"].map(
      (filename) => ({ code: "const port = process.env.PORT;", filename }),
    ),
    ...[
      "src/server.test.ts",
      "src/server_test.ts",
      "src/server.spec.tsx",
      "src/server_spec.mjs",
      "vite.config.ts",
      "vitest.config.mts",
    ].map((filename) => ({ code: "const port = import.meta.env.PORT;", filename })),
  ],
});
