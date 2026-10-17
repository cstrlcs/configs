import { RuleTester } from "oxlint/plugins-dev";

import { naming } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run("naming", naming, {
  invalid: [
    {
      code: "const customerID = load();",
      errors: [{ data: { name: "customerID" }, messageId: "camelCase" }],
    },
    {
      code: "function loadHTTPURL() {}",
      errors: [{ data: { name: "loadHTTPURL" }, messageId: "camelCase" }],
    },
    {
      code: "class HTTPClient {}",
      errors: [{ data: { name: "HTTPClient" }, messageId: "pascalCase" }],
    },
    {
      code: "interface IUser {}",
      errors: [{ data: { name: "IUser" }, messageId: "interfacePrefix" }],
    },
    {
      code: "type user_record = {};",
      errors: [{ data: { name: "user_record" }, messageId: "pascalCase" }],
    },
    {
      code: "enum Color { red }",
      errors: [{ data: { name: "red" }, messageId: "pascalCase" }],
    },
    {
      code: "function first<value>(items: value[]) {}",
      errors: [{ data: { name: "value" }, messageId: "pascalCase" }],
    },
    {
      code: "namespace utils {}",
      errors: [{ data: { name: "utils" }, messageId: "pascalCase" }],
    },
    {
      code: "const maxRetries = 3;",
      errors: [{ data: { name: "maxRetries" }, messageId: "constantCase" }],
    },
    {
      code: "export const defaults = { retries: 3, labels: ['a', 'b'] };",
      errors: [{ data: { name: "defaults" }, messageId: "constantCase" }],
    },
    {
      code: "const SERVICE_URL = 'https://' + host;",
      errors: [{ data: { name: "SERVICE_URL" }, messageId: "computedConstant" }],
    },
    {
      code: "function run() {\n  const LIMIT = 3;\n}",
      errors: [{ data: { name: "LIMIT" }, messageId: "computedConstant" }],
    },
    {
      code: "const RuleSchema = z.object({});",
      errors: [{ data: { name: "RuleSchema" }, messageId: "camelCase" }],
    },
    {
      code: "function run(_unused: string) {}",
      errors: [{ data: { name: "_unused" }, messageId: "camelCase" }],
    },
    {
      code: "try {\n  run();\n} catch (Problem) {}",
      errors: [{ data: { name: "Problem" }, messageId: "camelCase" }],
    },
    {
      code: "const button = forwardRef(() => null);",
      errors: [{ data: { name: "button" }, messageId: "pascalCase" }],
    },
    {
      code: "const Card = () => null;",
      errors: [{ data: { name: "Card" }, messageId: "camelCase" }],
    },
    {
      code: "function run() {\n  const ready = state === 'done';\n}",
      errors: [{ data: { name: "ready" }, messageId: "booleanPrefix" }],
    },
    {
      code: "function run() {\n  const visible = !hidden && items.some(isShown);\n}",
      errors: [{ data: { name: "visible" }, messageId: "booleanPrefix" }],
    },
    {
      code: "const DEBUG = false;",
      errors: [{ data: { name: "DEBUG" }, messageId: "booleanPrefix" }],
    },
    {
      code: "function isValid(value: string) {\n  return value === '' ? 'empty' : 'bad ' + value;\n}",
      errors: [{ data: { name: "isValid" }, messageId: "predicateReturn" }],
    },
    {
      code: "const getEnabled = () => flag === true;",
      errors: [{ data: { name: "getEnabled" }, messageId: "booleanReturn" }],
    },
    {
      code: "function run(Size = 1, ...Items: string[]) {}",
      errors: [
        { data: { name: "Size" }, messageId: "camelCase" },
        { data: { name: "Items" }, messageId: "camelCase" },
      ],
    },
    {
      code: "function getEnabled() {\n  run(() => {\n    return 'x';\n  });\n\n  return flag === true;\n}",
      errors: [{ data: { name: "getEnabled" }, messageId: "booleanReturn" }],
    },
    {
      code: "function run() {\n  const enabled = value as boolean;\n}",
      errors: [{ data: { name: "enabled" }, messageId: "booleanPrefix" }],
    },
  ],
  valid: [
    "const MAX_RETRIES = 3;",
    "const DEFAULT_LABELS = ['a', 'b'] as const;",
    "const LOOKUP = new Map([['a', 1]]);",
    "const RULES = { ...BASE_RULES, retries: -1 };",
    "const ALL_LABELS = [...BASE_LABELS, 'extra'];",
    `const GREETING = \`\${PREFIX}-world\`;`,
    "const IS_DEBUG = false;",
    "const cache = new Map();",
    "const resolver = createResolver({ cache: true });",
    "let count = 0;",
    "function Title() {\n  return <h1>Plans</h1>;\n}",
    "function renderRow() {\n  return <tr />;\n}",
    "const Row = ({ open }: Props) => (open ? <tr /> : null);",
    "const ThemeContext = createContext(null);",
    "const Button = forwardRef(function Button() {\n  return <button />;\n});",
    "const Box = styled.div``;",
    "const Link = styled(Anchor)``;",
    "function run(_: string, value: number) {}",
    "function isReady(user: User) {\n  return user.active;\n}",
    "function getUser(id: string) {\n  return users.get(id);\n}",
    "function run() {\n  const isReady = state === 'done';\n  const total = count + 1;\n}",
    "declare const __DEV__: boolean;",
    "declare global {\n  interface HTMLElementTagNameMap {}\n}",
    "import { pathToFileURL } from 'node:url';",
    "function run(options: Options) {\n  const { type_aware } = options;\n}",
    "function run() {\n  const config = { snake_key: 1 };\n}",
    "class HttpClient {\n  get_value() {}\n}",
    "type Point<T> = { x: T };",
    "enum Direction { Up, Down }",
    "interface Item {}",
  ],
});
