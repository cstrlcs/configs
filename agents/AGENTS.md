## Code standards (@cstrlcs/configs)

`oxlint.config.ts`, `oxfmt.config.ts` and `tsconfig.json` are the authority on style and correctness. Run `bun run lint:fix`, then fix what remains by changing the code, never by weakening or disabling a rule. Inline `oxlint-disable` and `eslint-disable` comments are rejected; when a rule truly cannot apply to some files, turn it off for those files in an `overrides` entry of `oxlint.config.ts`. The rule docs for the installed version are in `node_modules/@cstrlcs/configs/README.md`.

### When a rule blocks you

- `typescript/no-unsafe-*`, `typescript/no-unsafe-type-assertion`, `typescript/consistent-type-assertions`: parse `unknown` with a schema at the boundary, or narrow it with a type guard, `in`, `instanceof` or `Error.isError`. Never use `as`.
- `typescript/switch-exhaustiveness-check`: model the value as a discriminated union.
- `eslint/complexity`, `eslint/max-depth`, `eslint/max-params`: restructure with guard clauses, a lookup object, an options object or a deeper module. Do not split one behavior into helpers that only make sense read together; `cstrlcs/no-trivial-functions` rejects those.
- `oxc/no-barrel-file`, `cstrlcs/no-reexport-only-files`: import from the module that defines the value. A package exposes its API through `exports` in `package.json`.
- `import/no-default-export`: use named exports. Framework entry files are already exempt.
- `cstrlcs/no-env-access`: read configuration from the project's `env.ts`, which parses the environment once with a schema and exports a frozen typed object.
- `cstrlcs/no-forbidden-dependencies`: the import crosses a boundary. Move the code to the layer that owns it, or pass it in from the caller.
- `cstrlcs/no-comments`: say it with names and structure.
- knip: delete unused files, exports and dependencies, and declare every package you import.

### Architecture

- Organize by feature (`modules/<feature>/`, or by route or page). Dependencies flow `shared → features → app`. Features never import each other; compose them in the layer above. Move code to `shared` only when a second feature needs it.
- Name folders and files by purpose. No `utils`, `helpers`, `common` or `misc`.
- An abstraction waits for its third use. When one grows mode flags, inline it back. Prefer one module with a small interface over a chain of shallow wrappers.
- Keep I/O (database, network, clock, randomness, environment) at the edges. Domain logic takes values and returns values.
- Pass dependencies as parameters or a `deps` object built in one composition root. No DI containers or decorators. Interfaces only at real external seams such as payments, email, third-party APIs and the clock; no repository interface over your own ORM.

### Types and data

- Model states as discriminated unions so illegal states cannot be represented. Brand IDs and validated values.
- Parse every untrusted input once at its boundary: HTTP, environment, files, queues, storage, third-party and LLM responses. The schema is the type (`z.infer`); inside the boundary, trust it.
- Use `satisfies` to check a shape while keeping literal types. Use `as const` objects or literal unions instead of enums.

### Errors

- Bugs and broken invariants throw `Error` subclasses with a literal `name`, wrapping causes with `{ cause }`. Catch them at the shell: request handler, job runner, `main`.
- Expected failures such as not found, invalid input or conflict are part of the return type: `{ ok: true, value } | { ok: false, error }`.

### Backend

- Validate request input and serialize responses through schemas, and generate the API contract from them.
- Respond to errors with RFC 9457 problem details from one error handler. Never leak stack traces or internal fields.
- Query functions take the executor (`db` or `tx`). A transaction never spans a call to a third party. Side effects after a write are jobs enqueued in the same transaction, and their handlers are idempotent.
- Authorize per object inside the query (`WHERE owner_id = ...`) and deny by default.
- Emit one structured event per request or job with its key fields.

### React

- Components are pure. The React Compiler memoizes, so add `useMemo`, `useCallback` or `memo` only as a measured escape hatch, and never delete existing memoization without tests.
- Derive values during render. Effects only synchronize with external systems. Fetch server data in loaders, Server Components or TanStack Query, never in effects, and never copy props or query data into state.
- Keep state in the narrowest place that works: URL search params for shareable UI state, the server cache for server data, local state for the rest.
- Mutations use `<form action>` with `useActionState`. Non-urgent updates use transitions.
- Compose with `children` and compound components exported as flat named parts instead of piles of boolean props.
- Server Functions are public endpoints: validate, authenticate and authorize inside each one. Keep `'use client'` at the leaves.

### Vue

- `<script setup lang="ts">`, `ref()` first, props destructured with defaults, `defineModel`, `useTemplateRef`.
- Server data goes through `useFetch`, `useAsyncData` or Pinia Colada; Pinia holds client state. No module-scope reactive state in SSR apps.
- Templates are not linted: key every `v-for`, never put `v-if` on the same element as `v-for`, never mutate props, and avoid `v-html`.

### Tests

- Test behavior through public interfaces with real collaborators. Replace only process boundaries: the network (with MSW), time and third-party services. Use a real database.
- Query UI by role and label. Keep snapshots small. Reserve end-to-end tests for critical journeys.
- A bug fix starts with a test that fails without the fix.
