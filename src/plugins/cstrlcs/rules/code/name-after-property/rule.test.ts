import { RuleTester } from "oxlint/plugins-dev";

import { nameAfterProperty } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "name-after-property",
  nameAfterProperty,
  {
    invalid: [
      {
        code: "function run() {\n  const ready = a === b;\n\n  toggle({ isOpen: ready });\n}",
        errors: [{ data: { key: "isOpen", name: "ready" }, messageId: "rename" }],
        output: "function run() {\n  const isOpen = a === b;\n\n  toggle({ isOpen });\n}",
      },
      {
        code: "const handle = () => save();\n\nbind({ onClick: handle });",
        errors: [{ data: { key: "onClick", name: "handle" }, messageId: "rename" }],
        output: "const onClick = () => save();\n\nbind({ onClick });",
      },
      {
        code: "const project = join(root, 'App.tsx');\n\nrun({ code: 'x', filename: project });",
        errors: [{ data: { key: "filename", name: "project" }, messageId: "rename" }],
        output: "const filename = join(root, 'App.tsx');\n\nrun({ code: 'x', filename });",
      },
      {
        code: "function check() {\n  const project = load();\n\n  run({ filename: project });\n  run({ code: 'x', filename: project });\n}",
        errors: [{ data: { key: "filename", name: "project" }, messageId: "rename" }],
        output:
          "function check() {\n  const filename = load();\n\n  run({ filename });\n  run({ code: 'x', filename });\n}",
      },
      {
        code: "const target: string = load();\n\nopen({ path: target });",
        errors: [{ data: { key: "path", name: "target" }, messageId: "rename" }],
        output: "const path: string = load();\n\nopen({ path });",
      },
    ],
    valid: [
      "const target = load();\n\nopen({ path: target });\nsave({ file: target });",
      "const target = load();\n\nopen({ path: target });\nlog(target);",
      "export const target = load();\n\nopen({ path: target });",
      "const TARGET = 'App.tsx';\n\nopen({ path: TARGET });",
      "const id = load();\n\nsend({ user_id: id });",
      "const path = 1;\n\nfunction run() {\n  const target = load();\n\n  open({ path: target });\n}",
      "function run() {\n  const target = load();\n\n  open({ path: target });\n\n  return join(path);\n}",
      "let target = load();\n\ntarget = other();\nopen({ path: target });",
      "const target = load();\n\nopen({ [path]: target });",
      "const target = load();\n\nopen({ 'path': target });",
      "const path = load();\n\nopen({ path });",
      "const target = load();",
      "const { target } = load();\n\nopen({ path: target });",
      "declare const target: string;\n\nopen({ path: target });",
      "const target = load();\n\nclass Box {\n  path = target;\n}",
      "const target = load();\n\nfunction run(path: string) {\n  open({ path: target });\n}",
      "const target = load();\n\nfunction run() {\n  let path;\n\n  open({ path: target });\n}",
      "const target = load();\n\ntype Target = typeof target;\nopen({ path: target });",
      "function run() {\n  const isOpen = a === b;\n\n  toggle({ open: isOpen });\n}",
      "const Button = forwardRef(() => null);\n\nrender({ component: Button });",
      "const check = () => a === b;\n\nwatch({ getValue: check });",
      "const source = load();\nconst backup = load();\n\nopen({ path: source });\nopen({ path: backup });",
    ],
  },
);
