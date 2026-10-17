import { RuleTester } from "oxlint/plugins-dev";

import { tailwindCanonicalClasses } from "./rule.ts";

const filename = `${import.meta.dirname}/fixtures/project/src/App.tsx`;

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "tailwind-canonical-classes",
  tailwindCanonicalClasses,
  {
    invalid: [
      {
        code: '<div className="mbs-[16px] [display:flex]" />;',
        errors: [{ messageId: "canonical" }, { messageId: "canonical" }],
        output: '<div className="mbs-4 flex" />;',
      },
      {
        code: '<div className="w-4 h-4 ml-2 mr-2 mt-[16px]" />;',
        errors: 3,
        output: '<div className="size-4 mx-2 mt-4" />;',
      },
      {
        code: '<div className="p-1 top-0 right-0 bottom-0 left-0" />;',
        errors: [{ messageId: "canonical" }],
        output: '<div className="p-1 inset-0" />;',
      },
      {
        code: 'cn("hover:bg-[var(--brand)] !flex", { "flex-grow": isOpen });',
        errors: [
          { messageId: "canonical" },
          { messageId: "canonical" },
          { messageId: "canonical" },
        ],
        output: 'cn("hover:bg-(--brand) flex!", { "grow": isOpen });',
      },
      {
        code: 'const button = cva("data-[selected]:opacity-100", { variants: { size: { sm: "start-0" } } });',
        errors: [{ messageId: "canonical" }, { messageId: "canonical" }],
        output:
          'const button = cva("data-selected:opacity-100", { variants: { size: { sm: "inset-s-0" } } });',
      },
      {
        code: '<div className="shadow md:rounded hover:rounded-tl! blur" />;',
        errors: 4,
        output: '<div className="shadow-sm md:rounded-sm hover:rounded-tl-sm! blur-sm" />;',
      },
      {
        code: '<div className="hover:lg:text-red-500 focus:hover:print:underline hover:lg:dark:flex" />;',
        errors: 3,
        output:
          '<div className="lg:hover:text-red-500 print:focus:hover:underline dark:lg:hover:flex" />;',
      },
      {
        code: '<div className="hover:lg:mt-[16px] hover:md:shadow" />;',
        errors: [
          {
            data: { classNames: "hover:lg:mt-[16px]", replacement: "lg:hover:mt-4" },
            messageId: "canonical",
          },
          {
            data: { classNames: "hover:md:shadow", replacement: "md:hover:shadow-sm" },
            messageId: "canonical",
          },
        ],
        output: '<div className="lg:hover:mt-4 md:hover:shadow-sm" />;',
      },
      {
        code: '<div className="p-4 px-4 md:p-4 flex p-2 flex" />;',
        errors: [
          { data: { className: "px-4", cover: "p-4" }, messageId: "redundant" },
          { data: { className: "md:p-4", cover: "p-4" }, messageId: "redundant" },
          { data: { className: "flex" }, messageId: "duplicate" },
        ],
        output: '<div className="p-4 flex p-2" />;',
        recursive: true,
      },
      {
        code: '<div className="min-[1024px]:flex max-[48rem]:hidden rounded-[9999px] text-[14px]/6" />;',
        errors: 4,
        output: '<div className="lg:flex max-md:hidden rounded-full text-sm/6" />;',
      },
      {
        code: '<div className="p-2 md:p-4 lg:p-4" />;',
        errors: [{ data: { className: "lg:p-4", cover: "md:p-4" }, messageId: "redundant" }],
        output: '<div className="p-2 md:p-4" />;',
      },
    ],
    valid: [
      '<div className="mbs-4 flex inset-s-0 ms-2 me-2" />;',
      `<div className={\`mbs-[16px]\${size}\`} />;`,
      'const label = "[display:flex]";',
      '<div className="shadow-sm rounded-lg rounded-l-sm lg:hover:flex focus:hover:flex" />;',
      '<div className="drop-shadow" />;',
      { code: '<div className="flex flex-col" />;', filename },
      '<p className="text-[14px]" />;',
      '<div className="rounded-[3px]" />;',
      '<div className="p-4 md:p-2 lg:p-4" />;',
      '<div className="p-4 hover:p-2 md:p-4" />;',
    ],
  },
);
