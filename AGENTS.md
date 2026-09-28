# Agent instructions

- Enable every `cstrlcs` plugin rule in all presets: add it to `CSTRLCS_RULES` in `src/generators/oxlint.ts`. A rule that only works with project-specific options, like `cstrlcs/forbidden-dependencies`, stays opt-in.
- Run `bun run build` before every commit and commit the regenerated `oxlint/` and `plugins/` files with the change, because the publish workflow rebuilds and fails on any diff.
- Publish with `bun run release`, only after the build output is committed. It bumps the version, then tags and pushes, and the tag triggers the npm publish.
