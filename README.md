# @cstrlcs/configs

Strict configurations for oxlint, oxfmt, TypeScript and VSCode.

## What is this?

This package provides opinionated, strict configurations for modern JavaScript/TypeScript development. It includes:

- **oxlint** configs (base, react, vue, svelte)
- **oxfmt** configs (base)
- **TypeScript** configs

## Installation

Run the installer in your project root:

```bash
bunx @cstrlcs/configs install
```

This will:

- Install `@cstrlcs/configs`, `oxlint`, `oxlint-tsgolint`, and `oxfmt` as dev dependencies
- Create `oxlint.config.ts` and `oxfmt.config.ts`
- Create `tsconfig.json` extending the base config
- Add `lint` and `lint:fix` scripts to `package.json`
- Write `.gitattributes` with LF line endings
- Copy `.vscode/settings.json` and `.vscode/extensions.json`

## Doctor

Check that your project is correctly set up:

```bash
bunx @cstrlcs/configs doctor
```

This verifies `.gitattributes`, `tsconfig.json`, `package.json` scripts, `.vscode` files, and that all required packages are installed.

## Manual setup

```bash
bun add -D @cstrlcs/configs oxlint oxlint-tsgolint oxfmt
```

`oxlint.config.ts`:

```ts
import { defineConfig } from "oxlint";
import config from "@cstrlcs/configs/oxlint/base.ts";

export default defineConfig(config);
```

`oxfmt.config.ts`:

```ts
import { defineConfig } from "oxfmt";
import config from "@cstrlcs/configs/oxfmt/base.ts";

export default defineConfig(config);
```

`tsconfig.json`:

```json
{
  "extends": "@cstrlcs/configs/tsconfig/base.json",
  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } },
  "include": ["src"]
}
```

`package.json` scripts:

```json
{
  "scripts": {
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix && oxfmt"
  }
}
```

## Credits

This project was originally inspired by [Anthony Fu's ESLint config](https://github.com/antfu/eslint-config). Many of the rules and configurations were copied/adapted from his work before migrating to oxc.
