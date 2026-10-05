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
  `oxfmt.config.ts`
- Create `tsconfig.json` extending the base config
- Create `bun.d.ts` and include it in `tsconfig.json`
- Add `lint` and `lint:fix` scripts to `package.json`
- Write `.gitattributes` with LF line endings and `.editorconfig` matching oxfmt
- Append the required entries to `.gitignore`
- Copy `.vscode/settings.json` and `.vscode/extensions.json`
- Warn about conflicting tool configs it finds

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
- `.gitignore` contains `.env`, `.env.*`, `!.env.example`, `node_modules`, `.DS_Store` and
  `.claude`
- `tsconfig.json` extends the expected preset and Bun test globals are set up
- `oxlint.config.ts` imports the expected preset and `oxfmt.config.ts` imports the base preset
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

### Adding a plugin or rule

Sources live in `src/plugins/<plugin>/`, one folder per rule, and `bun run build` bundles each
plugin to `plugins/<plugin>.js` (Node does not strip types under `node_modules`, so the
published plugin must be JavaScript). Rules use the `createOnce` API from `@oxlint/plugins`.
Tests use Oxlint's `RuleTester` and run with `bun run test` on Node's test runner, because
`RuleTester` does not support Bun.

## Development

Install dependencies with `bun install --frozen-lockfile`, then run `bun run build` before
linting or using the repository's editor configurations. The build generates `oxlint/`,
`oxfmt/`, and `plugins/`. These directories are ignored by Git and included in the npm package
through `package.json#files`. Oxfmt's source configuration lives in
`src/generators/oxfmt-config.ts`.

Every native Oxlint rule is explicitly classified in `src/generators/oxlint-rules.ts`.
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

The `cstrlcs/forbidden-dependencies` rule borrows its rule format and matching logic from
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) by
[Sander Verweij](https://github.com/sverweij). Thank you for years of great work on it.
