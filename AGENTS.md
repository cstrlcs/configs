# Agent instructions

- Enable every `cstrlcs` plugin rule in all presets: add it to `CSTRLCS_RULES` in `src/generators/oxlint.ts`. A rule that only works with project-specific options, like `cstrlcs/no-forbidden-dependencies`, stays opt-in.
- Put each `cstrlcs` rule in `src/plugins/cstrlcs/rules/<domain>/<rule-id>/` as `rule.ts` (exporting the id in camelCase), `rule.test.ts` and, when a test needs files, `fixtures/`. Keep a helper that one rule uses in its `rule.ts`, and move it to `<domain>/shared/` when a second rule needs it. A Tailwind rule keeps its worker-side analysis in `analysis.ts`, because inside `rule.ts` it would close the import cycle `rule.ts` → `class-rule.ts` → `worker.ts` → `analysis.ts`. `src/plugins/cstrlcs/index.test.ts` and the `cstrlcs/no-forbidden-dependencies` options in `oxlint.config.ts` check this layout.
- Publish with `bun run release`.
