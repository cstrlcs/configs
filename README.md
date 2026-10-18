# @cstrlcs/configs

Strict configurations for oxlint, oxfmt, TypeScript and VSCode.

> [!WARNING]
> Under active development. Expect breaking changes between versions — pin an exact version.

## What is this?

This package provides opinionated, strict configurations for modern JavaScript/TypeScript development. It includes:

- **oxlint** configs (base, react, vue)
- **oxfmt** configs (base)
- **TypeScript** configs
- **oxlint JS plugin** (`cstrlcs`) with configurable rules that Oxlint does not ship natively

## Installation

Run the installer in your project root:

```bash
bunx @cstrlcs/configs install
```

Use `--cwd <dir>` (or `-c`) to target another project. In CI or other non-interactive sessions,
pass `--yes` (or `-y`) to skip confirmation. Run with `--help` or `--version` for usage or version
information. The CLI supports `install` and `doctor`; wizard mode, shell completions and log-level
flags are not provided.

This will:

- Install `@cstrlcs/configs` and `@types/bun`, plus `oxlint`, `oxlint-tsgolint`, and `oxfmt` at the
  exact versions in `peerDependencies`, all as exact-pinned dev dependencies
- Set `packageManager` in `package.json` to the running Bun version and `type` to `"module"`, and
  default `name` to the directory name and `private` to `true` when they are missing
- Create `oxlint.config.ts` with the preset that matches the project (`vue`, `react` or `base`) and
  an empty [`cstrlcs/no-forbidden-dependencies`](#cstrlcsno-forbidden-dependencies), and
  `oxfmt.config.ts`
- Create `tsconfig.json` extending the base config
- Create `bun.d.ts` and include it in `tsconfig.json`
- Add `lint` and `lint:fix` scripts to `package.json`
- Write `.gitattributes` with LF line endings and `.editorconfig` matching oxfmt
- Append the required entries to `.gitignore`
- Copy `.vscode/settings.json` and `.vscode/extensions.json`
- Warn about conflicting tool configs it finds, and when `cstrlcs/no-forbidden-dependencies` has no
  rules
- Run `oxlint --fix` and `oxfmt` without printing their output, and warn when lint issues remain

## Doctor

Check that your project is correctly set up:

```bash
bunx @cstrlcs/configs doctor
```

This verifies:

- Bun 1.4+ is installed and `packageManager` declares `bun@1.4.0` or newer
- `package.json` has a `name`, an explicit boolean `private` and `"type": "module"`
- In a monorepo, detected by an `apps` directory in the root, `workspaces` is declared and covers
  every `apps/*` package
- `.gitattributes`, `.editorconfig`, `.vscode/settings.json` and `.vscode/extensions.json` match the
  shipped versions exactly
- `.gitignore` contains `.env`, `.env.*`, `!.env*.example`, `node_modules/`, `.DS_Store` and
  `.claude/`, written as is or with a `**/` prefix, and `node_modules` and `.claude` also without
  the trailing slash
- `tsconfig.json` extends the expected preset and Bun test globals are set up
- `oxlint.config.ts` imports the expected preset and `oxfmt.config.ts` imports the base preset
- `cstrlcs/no-forbidden-dependencies` is declared in `oxlint.config.ts`. Declared without rules it
  only warns, and the message tells an agent how to map the project's boundaries or when to ignore
  it
- The `lint` and `lint:fix` scripts match the ones below
- No ESLint, Prettier, Biome, `.oxlintrc.json` or `*.code-workspace` config exists in the root or
  in any workspace, and no workspace has its own `.vscode/settings.json`
- All required packages are declared, `@cstrlcs/configs` is pinned to an exact version, and
  `oxlint`, `oxlint-tsgolint` and `oxfmt` are declared and installed at the exact
  `peerDependencies` versions

The oxlint preset is `vue` when `vue` is a dependency of the root or of any workspace, otherwise
`react` when `react` is, otherwise `base`.

## Manual setup

```bash
bun add -D --exact @cstrlcs/configs @types/bun
bun add -D --exact $(jq -r '.peerDependencies | to_entries[] | "\(.key)@\(.value)"' node_modules/@cstrlcs/configs/package.json)
```

`oxlint.config.ts` (use `react.js` or `vue.js` instead of `base.js` for React or Vue projects):

```ts
import { defineConfig } from "oxlint";
import config from "@cstrlcs/configs/oxlint/base.js";

export default defineConfig(config);
```

`oxfmt.config.ts`:

```ts
import { defineConfig } from "oxfmt";
import config from "@cstrlcs/configs/oxfmt/base.js";

export default defineConfig(config);
```

`tsconfig.json`:

```json
{
  "extends": "@cstrlcs/configs/tsconfig/base.json",
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
  "include": ["src", "bun.d.ts"]
}
```

`bun.d.ts`:

```ts
/// <reference types="bun" />
/// <reference types="bun-types/test-globals" />

export {};
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true
```

`package.json`:

```json
{
  "name": "my-project",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.4.0",
  "scripts": {
    "lint": "oxlint --type-aware .",
    "lint:fix": "oxlint --type-aware --fix; s=$?; oxfmt; exit $s"
  }
}
```

Copy `.vscode/settings.json` and `.vscode/extensions.json` from `node_modules/@cstrlcs/configs/.vscode`,
write `.gitattributes` with the contents of `GITATTRIBUTES` in `src/cli/requirements.ts`, and add the
`.gitignore` entries listed under [Doctor](#doctor).

## Bun tests

The base preset enables every Bun-compatible `vitest/*` rule at `error` severity. For the full
Vitest ruleset to work with Bun, the project must:

- Run Bun 1.4.0 or newer.
- Install `@types/bun`.
- Include the `bun.d.ts` file shown above in `tsconfig.json`.
- Use a recognized test filename: `*.test.*`, `*_test.*`, `*.spec.*`, or `*_spec.*`.
- Use the global `test`, `describe`, `expect`, `expectTypeOf`, hooks, `jest`, and `vi` APIs without
  importing them from `bun:test`.

The filename activates the preset's Vitest environment and rules; Vitest rules are turned off
for every other file, so top-level calls in application code are not reported as test setup.
The declaration file makes the
same globals available to TypeScript and Oxlint's type-aware rules. The explicit `bun` reference
also works when another preset, such as Vite, restricts `compilerOptions.types`.

Oxlint does not currently treat imports from `bun:test` as Vitest globals. The presets reject
that import in test files so the Vitest rules cannot silently stop working. Use Bun's test
globals without importing them. The installer creates and includes the required declaration
file automatically.

Test files that only use Bun globals do not need artificial imports or `export {}` module
markers. The preset allows those files to remain scripts while keeping the Vitest environment
active.

Bun's promise matchers return `void`, so do not await the matcher chain:

```ts
expect(await promise).toBe(expected);
```

Avoid `await expect(promise).resolves.toBe(expected)`, which is incompatible with Bun's matcher
types and the strict `await-thenable` checks.

This requires Bun 1.4.0 or newer so the global `vi` compatibility API is available. Of the 73
Vitest rules in Oxlint 1.80.0, 61 run at `error`; six remain disabled because they require
unsupported APIs, imports, or matcher typings, five conflict with stricter enabled rules, and
`require-test-timeout` is disabled so tests rely on the runner's default timeout.
The complete rule catalog is checked against the installed Oxlint CLI in CI, so an Oxlint
update that adds or removes a Vitest rule requires an explicit compatibility review.

## Strict baseline

All supported Oxlint categories are included and emitted as errors, including type-aware,
pedantic, restriction, and nursery rules. Type-aware linting and experimental TypeScript
diagnostics are enabled in the config itself, so the same checks run from the CLI and editor.
The baseline also enforces explicit return types, rejects ordinary type assertions, bans `any`
and non-null assertions, checks unsafe TypeScript operations and floating promises, and enables
strict complexity, callback, function, parameter, statement, snapshot, and file-size limits.
JSX and TSX files must use PascalCase filenames, such as `UserCard.tsx`; other files may use
camelCase, PascalCase, or kebab-case. Identifiers must be at least two characters long, except `_`
and generic type parameters, and common abbreviations such as `err`, `evt`, `idx`, `cb`, `obj`,
and `prev` are denied in favor of their full names.
The React preset assumes the automatic JSX transform and React Compiler, so it neither requires
`React` in JSX scope nor demands manual memoization of constructed context values. Rules that conflict with React Native styling are relaxed: `style` may be passed to components,
props may be spread to forward them to wrapped primitives, literal JSX text is allowed, and JSX
may nest up to four levels deep. `jsx-a11y/no-redundant-roles` accepts `role="list"` on `ul` and
`ol`, which keeps a styled list announced as a list, and `jsx-a11y/anchor-ambiguous-text` also
rejects Portuguese link text such as "clique aqui" and "saiba mais". The React and Vue presets
forbid `alert()`, `confirm()` and `prompt()` in favor of a dialog that names the action; the base
preset allows them, because Bun implements them as terminal prompts.

Oxlint 1.80.0 has no built-in rules for hardcoded secrets, general commented-out code, TODOs
that specifically lack an issue reference, or disable comments that specifically lack a
rationale. Those checks are intentionally not emulated; the `cstrlcs` plugin only adds the
rules described below.

## Plugins

`@cstrlcs/configs/plugins/cstrlcs.js` is an Oxlint [JS plugin](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).
Every preset loads it and enables `cstrlcs/name-after-property`, `cstrlcs/naming`,
`cstrlcs/no-comments`,
`cstrlcs/no-explicit-return-type`,
`cstrlcs/no-single-use-one-liners`, `cstrlcs/padding-between-statements`, the
[UI rules](#ui-rules) and the
[Tailwind CSS rules](#tailwind-css-rules);
`cstrlcs/no-forbidden-dependencies` needs project-specific options, so it stays out of the presets
and the installer adds it to `oxlint.config.ts`. A rule is
only added here when no native Oxlint rule covers it.

### `cstrlcs/name-after-property`

Reports a variable whose every use fills the same object property under another name, and fixes
it by renaming the variable to the property and writing each use as shorthand.

```ts
const project = `${import.meta.dirname}/fixtures/App.tsx`;

run({ code, filename: project });
run({ code: other, filename: project });
```

becomes `const filename = …` with `run({ code, filename })`. A variable is skipped when any use
is something else (a call argument, another property name, a reassignment), when it is exported,
destructured or ambient, when `cstrlcs/naming` keeps it in CONSTANT_CASE, when the property is
not a camelCase identifier, and when the new name is already declared or referenced in the scopes
involved, including by another variable that fills the same property.

### `cstrlcs/naming`

Enforces one naming convention, so every name has a single correct form. It follows the
[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html#naming-style),
with PascalCase enum members as in TypeScript's own guidelines, and boolean prefixes from the
typescript-eslint `naming-convention` example. It has no options and no fixes.

- PascalCase: classes, interfaces, type aliases, enums and their members, type parameters and
  namespaces. A function, or a `const` holding a function, may be PascalCase only when it returns
  JSX, and a `const` must be PascalCase when it holds `memo`, `forwardRef`, `lazy`,
  `createContext` or `styled` output.
- CONSTANT_CASE: a module-level `const` whose value is written literally, such as a string,
  number, regular expression, template, array, object, `Set` or `Map` made of literals and other
  constants. Any other `const`, including computed module-level values, is camelCase.
- camelCase: every other variable, function and parameter. `_` alone stays allowed for an unused
  parameter, but `_` is never a prefix or suffix.
- Acronyms are written as words: `customerId`, `loadHttpUrl`, `HttpClient`.
- Interfaces do not start with `I`.
- A variable initialized with a boolean expression (a comparison, `!`, `true`/`false`, `.some()`,
  `.includes()` and similar, or `&&`/`||` of those) starts with `is`, `has`, `can`, `should`,
  `did` or `will` (`IS_` and so on for constants).
- A function named like a predicate (`isValid`) must not only return non-boolean values, and a
  function named like a producer (`getEnabled`, `toFlag`, `parseX`) must not only return booleans.

Names that come from elsewhere are not checked: imports, destructured bindings, object and class
members, ambient declarations (`declare`, `declare global`) and `.d.ts` files. Oxlint JS plugins
have no type information, so booleans are recognized only by the syntax of their value.

### `cstrlcs/no-forbidden-dependencies`

Architecture boundaries in the style of dependency-cruiser's `forbidden` rules. Each option is
one rule: the importer must match `from` and the resolved import must match `to`. Both sides
take `path` and `pathNot`, a regex (or an array of regexes, joined with `|`) matched against
the path relative to the directory Oxlint runs in. `$1`, `$2`, ... in `to` refer to capture
groups of `from.path`.

Imports are resolved with `oxc-resolver`, the resolver Oxlint uses natively, so tsconfig
`paths`, `.js` → `.ts` extension aliases and package `exports` all work. Built-ins and
unresolvable imports are matched as written. Static imports, `export ... from` and `import()`
with a string literal are checked; CommonJS `require` is not. Type-only imports count too.

For cycles use the native `import/no-cycle`, already enabled in every preset.

```ts
import { defineConfig } from "oxlint";
import config from "@cstrlcs/configs/oxlint/base.js";

const MODULES = "^src/modules";

export default defineConfig({
  ...config,
  rules: {
    ...config.rules,
    "cstrlcs/no-forbidden-dependencies": [
      "error",
      {
        name: "shared-is-the-bottom-layer",
        comment: "shared must not reach up into an audience module.",
        from: { path: `${MODULES}/shared/` },
        to: { path: `${MODULES}/(admin|owner|user)/` },
      },
      {
        name: "no-sibling-modules",
        comment: "Audience modules only share code through shared.",
        from: { path: `${MODULES}/([^/]+)/` },
        to: { path: `${MODULES}/[^/]+/`, pathNot: [`${MODULES}/$1/`, `${MODULES}/shared/`] },
      },
    ],
  },
});
```

Severity applies to the whole Oxlint rule, not to each entry.

### `cstrlcs/no-comments`

Forbids comments, including JSDoc (`/** */`), so code explains itself through names and
structure. License headers (`/*! */`), shebangs, `oxlint-`/`eslint-` disable and enable directives,
`@ts-` directives, and triple-slash references are allowed. The rule has no options; silence a
required magic comment with a disable directive. Presets turn off `eslint/capitalized-comments`
in its favor.

### `cstrlcs/no-explicit-return-type`

Forbids return type annotations on functions, arrow functions and methods, so TypeScript infers
them. Type predicates (`x is T`, `asserts x`) and functions without a body (overloads,
`declare function`, abstract methods) are allowed. Removal is offered as a suggestion rather
than a fix, because inference can differ from the annotation (for example `[]` infers
`never[]`); apply it with `oxlint --fix-suggestions`. Recursive functions that TypeScript
cannot infer need a disable directive.

### UI rules

The `cstrlcs/ui-*` rules check JSX and a few JavaScript patterns against accessibility, zoom and
localization guidelines that no native Oxlint rule covers. They have no options and no fixes, and
skip an element whose attributes include a spread when the spread could supply the missing
attribute. Attribute names are matched case-insensitively, so `autoPlay` and `autoplay` both
count.

- `cstrlcs/ui-no-nested-interactive`: a native control (`a[href]`, `button`, `input`, `select`,
  `textarea`) inside another one. Components such as `Link` and `Button` are not resolved.
- `cstrlcs/ui-landmark-names`: `aria-label` or `aria-labelledby` on a `div` or `span` without a
  `role`, a `section` without `aria-label` or `aria-labelledby`, and each unnamed `nav` in a file
  that renders more than one.
- `cstrlcs/ui-zoomable`: `maximum-scale` below 2 or `user-scalable=no` in a viewport `<meta>`,
  `maximumScale` below 2 or `userScalable: false` in an exported `viewport` object (Next.js), and
  React Native `allowFontScaling={false}`.
- `cstrlcs/ui-media`: `<video autoPlay>` without `muted`, and a `srcSet` with `w` descriptors and
  no `sizes`.
- `cstrlcs/ui-pointer-events`: `onMouseDown`, `onMouseMove` or `onMouseUp` without the pointer
  equivalent, and `onPointerUp` without `onPointerCancel`.
- `cstrlcs/ui-autocomplete`: an `input` of type `email`, `tel` or `password`, or named after
  personal data (`email`, `phone`, `firstName`, `postal-code` and similar), without
  `autoComplete`.
- `cstrlcs/ui-no-manual-plural`: a ternary that compares with 1 and picks between a word and the
  word plus `s` or `es`, such as `count === 1 ? "file" : "files"`.

### `cstrlcs/no-single-use-one-liners`

Reports a function that is called once and only returns a one-line expression, so the call can be
replaced by that expression. It covers function declarations and `const` function expressions and
arrows whose body is that expression or a single `return` of it. It has no options and no fix.

A function is skipped when it is exported, referenced anywhere other than one direct call (such as
`items.filter(isEven)`), async, a generator, or a type predicate; when a parameter is destructured,
defaulted or rest; and when its expression spans several lines, uses `this`, `super` or
`arguments`, or contains `&&`, `||`, `??` or a ternary. The last exclusion keeps the rule from
undoing a helper extracted to stay under `eslint/complexity`.

```ts
function isTrue(value: boolean) {
  return value === true;
}

if (isTrue(ready)) {
  run();
}
```

### `cstrlcs/padding-between-statements`

Requires a blank line between consecutive statements in the same block, and forbids one between
single-line statements of the same kind, such as a run of `const` declarations or of calls.
Multi-line statements, statements with a body (`if`, `for`, `switch`, `try`, functions,
classes and similar, even when written on one line) and statements of different kinds (so
`return`, `break` and `throw` after anything else) are always separated. Imports may span
several lines and may be separated into groups. A blank line is kept when a comment sits
between the statements. The rule has no options and auto-fixes by inserting or removing the
blank line.

```ts
const x = 42;

if (x === 42) {
  run();
}

const y = 43;
const z = 44;

return x;
```

### Tailwind CSS rules

The `cstrlcs/tailwind-*` rules lint Tailwind CSS v4 class names and take no options.
`cstrlcs/tailwind-canonical-classes`, `cstrlcs/tailwind-no-unknown-classes`,
`cstrlcs/tailwind-no-conflicting-classes` and `cstrlcs/tailwind-no-concatenated-classes` are a
strict, v4-only port of
[eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss) built
on Oxlint's JS plugin API. The design system is analyzed once per file for all of them, so
enabling more of these rules costs little.

They run only when the linted file's nearest `package.json` directory resolves `tailwindcss` 4.2 or
a newer 4.x release; elsewhere they do nothing. The rules load that project's own Tailwind design
system, with its theme, `@utility` and `@plugin` definitions, from the shallowest CSS file in the
package that contains `@import "tailwindcss"`, falling back to the default theme when there is
none. Nested packages, `node_modules` and dot directories are not searched. The design system is
loaded once per process in a worker thread, so restart the editor's language server after changing
the CSS entry.

Class names are read from:

- JSX `class` and `className` attributes, and the keys of Solid's `classList`
- Strings passed to `clsx`, `cn`, `cx`, `twJoin` and `twMerge`, plus object keys for `clsx`, `cn`
  and `cx`
- `cva` and `tv` bases, variants, slots and compound variants
- Variables named `className`, `classNames`, `classes`, `style` or `styles`

Strings inside conditional branches, the right side of `&&`/`||`, `+` concatenations, template
literals and arrays are included. Oxlint only parses the script part of Vue, Svelte and Astro
files, so template markup there is not checked.

`cstrlcs/tailwind-canonical-classes` reports class lists that are not in their canonical v4
spelling, with a fix:

- Tailwind's own `canonicalizeCandidates`: `mt-[16px]` → `mt-4`, `!flex` → `flex!`,
  `flex-grow` → `grow`, `w-4 h-4` → `size-4`, `ml-2 mr-2` → `mx-2`. It assumes a 16px root font
  size and never turns a logical utility into a physical one. A collapse into one of the project's
  own `@utility` classes is not suggested.
- Size-less utilities kept only for v3 compatibility: `shadow`, `blur`, `rounded`, `rounded-l` and
  similar → their `-sm` size.
- Arbitrary values that match the theme: `min-[1024px]:` → `lg:`, `max-[48rem]:` → `max-md:`,
  `rounded-[9999px]` → `rounded-full`, `text-[14px]/6` → `text-sm/6`.
- Media and feature-query variants before other variants: `hover:lg:flex` → `lg:hover:flex`.
- Repeated classes, classes another class in the list already covers (`px-4` next to `p-4`), and
  breakpoint classes that repeat the value already in effect (`md:p-4` after `p-4`) are removed.

Each class gets one fix that applies every rewrite. Removing adjacent classes can take a second
`oxlint --fix` run, because the fixes touch.

These rules report without a fix:

- `cstrlcs/tailwind-no-unknown-classes`: classes the design system does not generate, except
  `group` and `peer` markers. Define custom classes with `@utility`. An attribute, call or variable
  with no Tailwind class at all, such as `className="swiper-slide"`, is treated as plain CSS and
  skipped.
- `cstrlcs/tailwind-no-conflicting-classes`: classes that set the same CSS properties under the
  same variants, such as `flex hidden`.
- `cstrlcs/tailwind-no-concatenated-classes`: class names built from dynamic values, such as
  `` `text-${size}` `` or `"bg-" + color`, which Tailwind cannot detect.
- `cstrlcs/tailwind-contrast`: a text and background color in the same list, under the same
  variants, below the WCAG AA ratio (4.5:1, or 3:1 for large text). Colors set in another element
  are not seen.
- `cstrlcs/tailwind-typography`: text below 11px, the floor for functional labels, unless the list
  is `sr-only`; text above 96px (6rem); letter-spacing below -0.04em, or above 0.05em on text that
  is not uppercase.
- `cstrlcs/tailwind-theme-tokens`: arbitrary colors, radii, font families and font sizes the theme
  does not define, such as `bg-[#123456]`; an arbitrary font size equal to a theme size, such as
  `text-[14px]`, whose theme utility also sets line-height, so pick `text-sm` or
  `text-sm/<leading>` deliberately; and padding, margin or gap that is not a multiple of 2px, such
  as `p-3.25` or `mt-[7px]`, with `1px` hairlines allowed.
- `cstrlcs/tailwind-decoration`: gradient-filled text, repeating stripes and grid-line backgrounds;
  a shadow layer with no offset and a blur, such as `shadow-[0_0_24px_…]`; and a border of 2px or
  more on one side with a chromatic border color and a radius in the same list.
- `cstrlcs/tailwind-no-idle-will-change`: `will-change` without a variant, in a list with no
  animation, transition or filter.

`cstrlcs/tailwind-focus-and-reveal` reports content hidden with `opacity-0` or `invisible` and
revealed by a `hover:` or `group-hover:` variant with no `focus` variant revealing it too, and
`outline-none` in a list whose focus state draws a ring and no outline. It fixes the second by
writing `outline-hidden`, which keeps a transparent outline that forced colors mode paints.

Class order and whitespace are left to Oxfmt: the base Oxfmt preset enables
`sortTailwindcss` for `class`, `className` and the same class-merging functions. Without a
`stylesheet` it sorts against Tailwind's default theme, so classes from a custom theme or
`@utility` are treated as unknown and moved to the front. Point it at the project's CSS entry to
sort them too:

```ts
import { defineConfig } from "oxfmt";
import config from "@cstrlcs/configs/oxfmt/base.js";

export default defineConfig({
  ...config,
  sortTailwindcss: { ...config.sortTailwindcss, stylesheet: "./src/styles/app.css" },
});
```

Upstream rules that canonicalization already covers (shorthand classes, important position,
variable syntax) and rules that need project-specific options (restricted classes) are not ported.

### Adding a plugin or rule

Sources live in `src/plugins/<plugin>/`, and `bun run build` bundles each plugin to
`plugins/<plugin>.js` (Node does not strip types under `node_modules`, so the published plugin must
be JavaScript). Rules use the `createOnce` API from `@oxlint/plugins`. Each rule has its own folder
under `rules/<domain>/` (`code`, `tailwind` and `ui`) named after its id, holding `rule.ts`,
`rule.test.ts` and, when a test needs files, `fixtures/`; the plugin's `index.ts` derives each id
from the camelCase name `rule.ts` exports. Modules shared by the rules of one domain live in
`rules/<domain>/shared/`. Tailwind rules add an `analysis.ts` with the part that runs in the
design-system worker thread, which `rules/tailwind/shared/analysis.ts` composes.
`src/plugins/cstrlcs/index.test.ts` and the repository's `cstrlcs/no-forbidden-dependencies`
options in `oxlint.config.ts` check this layout and the direction of imports.
Tests use Oxlint's `RuleTester` and run with `bun run test` on Vitest, because
`RuleTester` does not support Bun.

## Development

Install dependencies with `bun install --frozen-lockfile`, then run `bun run build` before
linting or using the repository's editor configurations. The build generates `oxlint/`,
`oxfmt/`, and `plugins/`. These directories are ignored by Git and included in the npm package
through `package.json#files`. Oxfmt's source configuration lives in
`src/generators/oxfmt.ts`.

Every native Oxlint rule is explicitly classified in `src/generators/oxlint.ts`.
The generator compares these declarations against `oxlint --rules -f json` before writing
presets. New, removed, renamed, duplicate, or overlapping rules fail the build, including
rules from plugins not currently used by any preset. Update the enabled or disabled lists
when upgrading Oxlint. Rule options and file overrides remain in `src/generators/oxlint.ts`.
Presets disable automatic category activation and enable only declared rules.

The CI builds and checks lint, formatting, types, tests, and package contents on pull requests
and pushes to `main`. The package check runs [publint](https://publint.dev) in strict mode,
which also fails when a generated directory is missing from the package. The build formats only
generated files and does not apply fixes to sources. To run the checks locally after building:

```bash
bun run check
```

Use `bun run release` to run `publi.sh`, which commits changes, updates the version, and pushes
a release tag. The tag workflow verifies that the tag matches `package.json#version`, runs the
same build and checks through the shared `.github/actions/validate` action, and publishes to npm.

## Credits

This project was originally inspired by [Anthony Fu's ESLint config](https://github.com/antfu/eslint-config). Many of the rules and configurations were copied/adapted from his work before migrating to oxc.

The `cstrlcs/no-forbidden-dependencies` rule borrows its rule format and matching logic from
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) by
[Sander Verweij](https://github.com/sverweij). Thank you for years of great work on it.

The Tailwind CSS rules are a port of
[eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss) by
[Roger Schönbächler](https://github.com/schoero): its rule names, class extraction defaults,
canonical-class attribution and conflict detection come from his work.
Thank you for building it.
