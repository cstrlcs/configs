import { RuleTester } from "oxlint/plugins-dev";

import { noExplicitReturnType } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-explicit-return-type",
  noExplicitReturnType,
  {
    invalid: [
      {
        code: "function run(): number {\n  return 1;\n}",
        errors: [
          {
            messageId: "forbidden",
            suggestions: [{ messageId: "remove", output: "function run() {\n  return 1;\n}" }],
          },
        ],
        output: null,
      },
      {
        code: "const run = function (): number {\n  return 1;\n};",
        errors: [
          {
            messageId: "forbidden",
            suggestions: [
              { messageId: "remove", output: "const run = function () {\n  return 1;\n};" },
            ],
          },
        ],
        output: null,
      },
      {
        code: "const run = (): number => 1;",
        errors: [
          {
            messageId: "forbidden",
            suggestions: [{ messageId: "remove", output: "const run = () => 1;" }],
          },
        ],
        output: null,
      },
      {
        code: "async function load(): Promise<void> {}",
        errors: [
          {
            messageId: "forbidden",
            suggestions: [{ messageId: "remove", output: "async function load() {}" }],
          },
        ],
        output: null,
      },
      {
        code: "class Runner {\n  run(): number {\n    return 1;\n  }\n}",
        errors: [
          {
            messageId: "forbidden",
            suggestions: [
              { messageId: "remove", output: "class Runner {\n  run() {\n    return 1;\n  }\n}" },
            ],
          },
        ],
        output: null,
      },
      {
        code: "const runner = {\n  run(): number {\n    return 1;\n  },\n};",
        errors: [
          {
            messageId: "forbidden",
            suggestions: [
              {
                messageId: "remove",
                output: "const runner = {\n  run() {\n    return 1;\n  },\n};",
              },
            ],
          },
        ],
        output: null,
      },
    ],
    valid: [
      "function run() {\n  return 1;\n}",
      'function isText(value: unknown): value is string {\n  return typeof value === "string";\n}',
      'const isText = (value: unknown): value is string => typeof value === "string";',
      'function assertText(value: unknown): asserts value is string {\n  if (typeof value !== "string") {\n    throw new TypeError("Expected text.");\n  }\n}',
      'function assertDefined(value: unknown): asserts value {\n  if (value === undefined) {\n    throw new TypeError("Expected a value.");\n  }\n}',
      "function parse(value: string): string;\nfunction parse(value: number): number;\nfunction parse(value: string | number) {\n  return value;\n}",
      "declare function run(): number;",
      "abstract class Runner {\n  abstract run(): number;\n}",
      "class Runner {\n  run(value: string): string;\n  run(value: number): number;\n  run(value: string | number) {\n    return value;\n  }\n}",
    ],
  },
);
