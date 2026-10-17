import { RuleTester } from "oxlint/plugins-dev";

import { tailwindNoUnknownClasses } from "./rule.ts";

const project = `${import.meta.dirname}/fixtures/project/src/App.tsx`;
const unsupportedTailwind = `${import.meta.dirname}/fixtures/unsupported-tailwind/src/App.tsx`;

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-no-unknown-classes",
  tailwindNoUnknownClasses,
  {
    invalid: [
      {
        code: '<div className="flex bg-opacity-50 card" />;',
        errors: [
          { data: { className: "bg-opacity-50" }, messageId: "unknown" },
          { data: { className: "card" }, messageId: "unknown" },
        ],
      },
      {
        code: 'clsx("p-2", { "not-a-class": active });',
        errors: [{ data: { className: "not-a-class" }, messageId: "unknown" }],
      },
      {
        code: `<div className={\`nope flex hidden bg-\${color}\`} />;`,
        errors: [{ messageId: "unknown" }],
      },
      {
        code: '<div className="flex swiper-slide" />;',
        errors: [{ data: { className: "swiper-slide" }, messageId: "unknown" }],
      },
      {
        code: '<div class="p-2 nope-class" />;',
        errors: [{ data: { className: "nope-class" }, messageId: "unknown" }],
      },
      {
        code: '<div classList={{ "p-2": active, "nope-key": open, "m-2": "nope-value" }} />;',
        errors: [{ data: { className: "nope-key" }, messageId: "unknown" }],
      },
      {
        code: 'cx("p-2 nope-cx");',
        errors: [{ data: { className: "nope-cx" }, messageId: "unknown" }],
      },
      {
        code: 'cx("p-2", { "nope-key": active });',
        errors: [{ data: { className: "nope-key" }, messageId: "unknown" }],
      },
      {
        code: 'twJoin("p-2 nope-join");',
        errors: [{ data: { className: "nope-join" }, messageId: "unknown" }],
      },
      {
        code: 'twMerge("p-2 nope-merge");',
        errors: [{ data: { className: "nope-merge" }, messageId: "unknown" }],
      },
      {
        code: 'tv({ base: "p-2 nope-base" });',
        errors: [{ data: { className: "nope-base" }, messageId: "unknown" }],
      },
      {
        code: 'tv({ slots: { root: "p-2 nope-slot" } });',
        errors: [{ data: { className: "nope-slot" }, messageId: "unknown" }],
      },
      {
        code: 'tv({ base: "p-2", compoundVariants: [{ size: "sm", class: "m-2 nope-compound" }] });',
        errors: [{ data: { className: "nope-compound" }, messageId: "unknown" }],
      },
      {
        code: 'tv({ base: "p-2", compoundSlots: [{ slots: ["root"], className: "m-2 nope-compound" }] });',
        errors: [{ data: { className: "nope-compound" }, messageId: "unknown" }],
      },
      {
        code: 'cva("p-2", { compoundVariants: [{ intent: "primary", class: "m-2 nope-compound" }] });',
        errors: [{ data: { className: "nope-compound" }, messageId: "unknown" }],
      },
      {
        code: 'cva("p-2", { compoundVariants: [{ intent: "primary", className: "m-2 nope-compound" }] });',
        errors: [{ data: { className: "nope-compound" }, messageId: "unknown" }],
      },
      {
        code: 'const className = "p-2 nope-variable";',
        errors: [{ data: { className: "nope-variable" }, messageId: "unknown" }],
      },
      {
        code: 'const classNames = "p-2 nope-variable";',
        errors: [{ data: { className: "nope-variable" }, messageId: "unknown" }],
      },
      {
        code: 'const classes = "p-2 nope-variable";',
        errors: [{ data: { className: "nope-variable" }, messageId: "unknown" }],
      },
      {
        code: 'const style = "p-2 nope-variable";',
        errors: [{ data: { className: "nope-variable" }, messageId: "unknown" }],
      },
      {
        code: 'const styles = "p-2 nope-variable";',
        errors: [{ data: { className: "nope-variable" }, messageId: "unknown" }],
      },
      {
        code: '<div className={active ? "p-2 nope-then" : "m-2 nope-else"} />;',
        errors: [
          { data: { className: "nope-then" }, messageId: "unknown" },
          { data: { className: "nope-else" }, messageId: "unknown" },
        ],
      },
      {
        code: '<div className={active && "p-2 nope-and"} />;',
        errors: [{ data: { className: "nope-and" }, messageId: "unknown" }],
      },
      {
        code: '<div className={custom || "p-2 nope-or"} />;',
        errors: [{ data: { className: "nope-or" }, messageId: "unknown" }],
      },
      {
        code: 'const classes = ["p-2", "nope-array"];',
        errors: [{ data: { className: "nope-array" }, messageId: "unknown" }],
      },
      {
        code: 'const className = "p-2 nope-as" as const;',
        errors: [{ data: { className: "nope-as" }, messageId: "unknown" }],
      },
      {
        code: 'const className = "p-2 nope-satisfies" satisfies string;',
        errors: [{ data: { className: "nope-satisfies" }, messageId: "unknown" }],
      },
      {
        code: '<div className="flex card admin-card" />;',
        errors: [{ data: { className: "admin-card" }, messageId: "unknown" }],
        filename: project,
      },
      {
        code: '<div className="flex card inner-card" />;',
        errors: [{ data: { className: "inner-card" }, messageId: "unknown" }],
        filename: project,
      },
    ],
    valid: [
      '<div className="swiper-slide" />;',
      '<div className="group peer/label flex hover:bg-red-500/50" />;',
      '<div title="not-a-class" />;',
      'twJoin("p-2", { "nope-key": active });',
      'twMerge("p-2", { "nope-key": active });',
      String.raw`<div className="p-2 nope\name" />;`,
      { code: '<div className="flex nope-class" />;', filename: unsupportedTailwind },
      '<><div className="flex" /><div className="swiper-slide" /></>;',
    ],
  },
);
