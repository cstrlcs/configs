# @cstrlcs/configs

Strict configurations for oxlint, oxfmt, TypeScript and VSCode.

> [!WARNING]
> Under active development. Expect breaking changes between versions — pin an exact version.

## What is this?

This package provides opinionated, strict configurations for modern JavaScript/TypeScript development. It includes:

- **oxlint** configs (base, react, vue)
- **oxfmt** configs (base)
- **TypeScript** configs

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

The filename activates the preset's Vitest environment, while the declaration file makes the
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
`React` in JSX scope nor demands manual memoization of constructed context values.

Oxlint 1.80.0 has no built-in rules for hardcoded secrets, general commented-out code, TODOs
that specifically lack an issue reference, or disable comments that specifically lack a
rationale. Those checks are intentionally not emulated because this package does not ship
custom lint rules.

## Credits

This project was originally inspired by [Anthony Fu's ESLint config](https://github.com/antfu/eslint-config). Many of the rules and configurations were copied/adapted from his work before migrating to oxc.
