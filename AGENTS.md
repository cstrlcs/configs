# Agent instructions

- Enable every `cstrlcs` plugin rule in all presets: add it to `CSTRLCS_RULES` in `src/generators/oxlint.ts`. A rule that only works with project-specific options, like `cstrlcs/no-forbidden-dependencies`, stays opt-in.
- Put each `cstrlcs` rule in `src/plugins/cstrlcs/rules/<domain>/<rule-id>/` as `rule.ts` (exporting the id in camelCase), `rule.test.ts` and, when a test needs files, `fixtures/`. Keep a helper that one rule uses in its `rule.ts`, and move it to `<domain>/shared/` when a second rule needs it. A Tailwind rule keeps its worker-side analysis in `analysis.ts`, because inside `rule.ts` it would close the import cycle `rule.ts` → `class-rule.ts` → `worker.ts` → `analysis.ts`. `src/plugins/cstrlcs/index.test.ts` and the `cstrlcs/no-forbidden-dependencies` options in `oxlint.config.ts` check this layout.
- The library preset (`LIBRARY_RULES` and `LIBRARY_CSTRLCS_RULES` in `src/generators/oxlint.ts`, plus `tsconfig/library.json`) only relaxes what published packages need, documenting and typing their exports. Keep every other rule as strict as in apps.
- `agents/AGENTS.md` is the block `install` writes into each project's `AGENTS.md` and `doctor` compares exactly. Keep it short, cite rule ids instead of restating rules, and update it when a rule it names changes.
- Publish with `bun run release`.
