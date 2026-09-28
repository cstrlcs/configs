# Agent instructions

- Enable every `cstrlcs` plugin rule in all presets: add it to `CSTRLCS_RULES` in `src/generators/oxlint.ts`. A rule that only works with project-specific options, like `cstrlcs/forbidden-dependencies`, stays opt-in.
- Publish with `bun run release`.
