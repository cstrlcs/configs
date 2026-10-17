import { RuleTester } from "oxlint/plugins-dev";

import { noSingleUseOneLiners } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "no-single-use-one-liners",
  noSingleUseOneLiners,
  {
    invalid: [
      {
        code: "function isTrue(statement: boolean) {\n  return statement === true;\n}\n\nrun(isTrue(value));",
        errors: [{ data: { name: "isTrue" }, messageId: "inline" }],
      },
      {
        code: "const double = (value: number) => value * 2;\n\nrun(double(size));",
        errors: [{ data: { name: "double" }, messageId: "inline" }],
      },
      {
        code: "const label = (name: string) => {\n  return name.trim();\n};\n\nrun(label(user));",
        errors: [{ data: { name: "label" }, messageId: "inline" }],
      },
      {
        code: "const area = function (side: number) {\n  return side * side;\n};\n\nrun(area(4));",
        errors: [{ data: { name: "area" }, messageId: "inline" }],
      },
    ],
    valid: [
      "function isTrue(value: boolean) {\n  return value === true;\n}\n\nrun(isTrue(a), isTrue(b));",
      "export function isTrue(value: boolean) {\n  return value === true;\n}\n\nrun(isTrue(a));",
      "export const double = (value: number) => value * 2;\n\nrun(double(size));",
      "const isEven = (value: number) => value % 2 === 0;\n\nrun(items.filter(isEven));",
      "function total(items: number[]) {\n  const sum = items.reduce((acc, item) => acc + item, 0);\n\n  return sum;\n}\n\nrun(total(list));",
      "const join = (parts: string[]) =>\n  parts\n    .map((part) => part.trim())\n    .join(' ');\n\nrun(join(list));",
      "function isReady(user: User) {\n  return user.active && user.verified;\n}\n\nrun(isReady(current));",
      "const pick = (flag: boolean) => (flag ? 'on' : 'off');\n\nrun(pick(state));",
      "function isString(value: unknown): value is string {\n  return typeof value === 'string';\n}\n\nrun(isString(input));",
      "async function load(id: string) {\n  return fetchUser(id);\n}\n\nrun(load(id));",
      "const read = function () {\n  return this.value;\n};\n\nrun(read());",
      "function first() {\n  return arguments[0];\n}\n\nrun(first(1));",
      "const name = ({ first }: User) => first;\n\nrun(name(user));",
      "let double = (value: number) => value * 2;\n\nrun(double(size));",
      "function loop(count: number) {\n  return loop(count - 1);\n}",
      "function Title() {\n  return <h1>Plans</h1>;\n}\n\nrender(<Title />);",
    ],
  },
);
