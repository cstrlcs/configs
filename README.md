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

This will:

- Install `@cstrlcs/configs`, `@types/bun`, `oxlint`, `oxlint-tsgolint`, and `oxfmt` as dev dependencies
- Create `oxlint.config.ts` and `oxfmt.config.ts`
- Create `tsconfig.json` extending the base config
- Create `bun.d.ts` and include it in `tsconfig.json`
- Add `lint` and `lint:fix` scripts to `package.json`
- Write `.gitattributes` with LF line endings
- Copy `.vscode/settings.json` and `.vscode/extensions.json`

## Doctor

Check that your project is correctly set up:

```bash
bunx @cstrlcs/configs doctor
```

This verifies Bun 1.4+, Bun test globals, `.gitattributes`, `tsconfig.json`, `package.json`
scripts, `.vscode` files, and that all required packages are installed.

## Manual setup

```bash
bun add -D @cstrlcs/configs @types/bun oxlint oxlint-tsgolint oxfmt
```

`oxlint.config.ts`:

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
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } },
  "include": ["src", "bun.d.ts"]
}
```

`bun.d.ts`:

```ts
/// <reference types="bun" />
/// <reference types="bun-types/test-globals" />

export {};
```

`package.json` scripts:

```json
{
  "scripts": {
    "lint": "oxlint --type-aware .",
    "lint:fix": "oxlint --type-aware --fix && oxfmt"
  }
}
```

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
Vitest rules in Oxlint 1.80.0, 62 run at `error`; six remain disabled because they require
unsupported APIs, imports, or matcher typings, and five conflict with stricter enabled rules.
The complete rule catalog is checked against the installed Oxlint CLI in CI, so an Oxlint
update that adds or removes a Vitest rule requires an explicit compatibility review.

## Strict baseline

All supported Oxlint categories are included and emitted as errors, including type-aware,
pedantic, restriction, and nursery rules. Type-aware linting and experimental TypeScript
diagnostics are enabled in the config itself, so the same checks run from the CLI and editor.
The baseline also enforces explicit return types, rejects ordinary type assertions, bans `any`
and non-null assertions, checks unsafe TypeScript operations and floating promises, and enables
strict complexity, callback, function, parameter, statement, snapshot, and file-size limits.
The React preset assumes the automatic JSX transform and React Compiler, so it neither requires
`React` in JSX scope nor demands manual memoization of constructed context values. Rules that conflict with React Native styling are relaxed: `style` may be passed to components,
props may be spread to forward them to wrapped primitives, literal JSX text is allowed, and JSX
may nest up to four levels deep.

Oxlint 1.80.0 has no built-in rules for hardcoded secrets, general commented-out code, TODOs
that specifically lack an issue reference, or disable comments that specifically lack a
rationale. Those checks are intentionally not emulated; the `cstrlcs` plugin only adds the
rules described below.

## Plugins

`@cstrlcs/configs/plugins/cstrlcs.js` is an Oxlint [JS plugin](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).
Every preset loads it and enables `cstrlcs/no-comments`, `cstrlcs/no-explicit-return-type` and
`cstrlcs/padding-between-statements`;
`cstrlcs/forbidden-dependencies` needs project-specific options, so it stays opt-in. A rule is
only added here when no native Oxlint rule covers it.

### `cstrlcs/forbidden-dependencies`

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
    "cstrlcs/forbidden-dependencies": [
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

### `cstrlcs/padding-between-statements`

Requires a blank line between consecutive statements in the same block, except between
single-line statements of the same kind, such as a run of `const` declarations or of calls.
Multi-line statements, statements with a body (`if`, `for`, `switch`, `try`, functions,
classes and similar, even when written on one line) and statements of different kinds (so
`return`, `break` and `throw` after anything else) are always separated. Imports stay grouped
even when they span several lines. The rule has no options and auto-fixes by inserting the
missing blank line.

```ts
const x = 42;

if (x === 42) {
  run();
}

const y = 43;
const z = 44;

return x;
```

### Adding a plugin or rule

Sources live in `src/plugins/<plugin>/`, one folder per rule, and `bun run build` bundles each
plugin to `plugins/<plugin>.js` (Node does not strip types under `node_modules`, so the
published plugin must be JavaScript). Rules use the `createOnce` API from `@oxlint/plugins`.
Tests use Oxlint's `RuleTester` and run with `bun run test` on Node's test runner, because
`RuleTester` does not support Bun.

## Credits

This project was originally inspired by [Anthony Fu's ESLint config](https://github.com/antfu/eslint-config). Many of the rules and configurations were copied/adapted from his work before migrating to oxc.

The `cstrlcs/forbidden-dependencies` rule borrows its rule format and matching logic from
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) by
[Sander Verweij](https://github.com/sverweij). Thank you for years of great work on it.
