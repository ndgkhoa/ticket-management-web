# Phase 03 — Data Layer: Supabase + MSW

**Priority:** P0 · **Status:** ⬜ todo · **Depends:** Phase 01, 02

## Overview

Build the whole data foundation: Supabase schema/RLS/seed (live source), generated types, a typed data-access layer, and MSW handlers mirroring the same contract (mock + test source). App switches via `VITE_API_MODE=msw|supabase`.

## Key insights

- Replace `axios` custom-auth + `window.location` redirects with Supabase client + session.
- Naming refactor (`Id`→`id`) lands here: domain models are camelCase, mapped at the api boundary via Zod `.transform` from snake_case rows.
- Query-key + queryOptions factories established here for all features to reuse.

## Requirements

- Supabase project + local dev (supabase CLI). SQL migrations for all 16 tables + enums + indexes (see `database-schema.md`).
- RLS policies + `has_permission()` function; enable `pgvector`.
- Seed: roles/permissions matrix, demo accounts (owner/admin/agent/customer), teams/categories/tags/SLA, ~30 tickets w/ messages+events.
- `supabase gen types typescript` → `src/lib/database.types.ts`.
- Data-access layer per domain returning **camelCase domain models** validated by Zod.
- MSW handlers replicating each endpoint's response shape (from the same fixtures as seed).
- `VITE_API_MODE` switch: single `dataClient` abstraction picking Supabase vs MSW-backed fetch.

### List query contract (shared by every paginated list)

Phase 06 promises server-side sort/filter/pagination + keyword search; this is the layer that has to actually support it. Define it **once** in `src/lib/list-query.ts` and reuse — not per feature.

- **Params in** (one Zod schema, reused by the router's `validateSearch` in Phase 04 so URL ↔ API can't drift):
  ```ts
  { page: number, pageSize: number, sort?: { field: string, dir: 'asc' | 'desc' }, q?: string, filters: Record<string, string | string[]> }
  ```
- **Response out** — every list endpoint, no exceptions: `{ rows: T[], totalCount: number, pageCount: number }`. `pageCount` is computed server-side so the table never guesses.
- **Supabase impl:** `.select('...', { count: 'estimated' })` + `.order(field, { ascending })` + `.range(from, to)` where `from = (page - 1) * pageSize`, `to = from + pageSize - 1`. Count comes back on `response.count`.
  - `count: 'estimated'` (planner estimate, upgraded to exact when small) — **not `'exact'`**: exact count re-scans the whole filtered set on every keystroke of a debounced search and dominates query time as tickets grow. Revisit only if a demo needs an exact total.
  - Always add a **deterministic tiebreaker** to `.order()` (`created_at desc, id desc`) — offset pagination without a total order silently duplicates/skips rows across pages.
  - Offset pagination is a deliberate choice: demo data is ~30–5k tickets and the UI needs numbered pages. Note the limit (deep offsets degrade) — keyset is out of scope, not overlooked.
- **Keyword search (`q`):** `.textSearch('search_vector', q, { type: 'websearch' })` against the generated tsvector column (see `database-schema.md`). Empty/blank `q` must skip the clause entirely, not search for `''`.
- **MSW parity is mandatory:** handlers must implement filter → search → sort → slice over the shared fixtures and return the same `{ rows, totalCount, pageCount }`. A pagination bug that only reproduces against Supabase means the contract is broken. Tests assert parity (same params → same shape from both sources).

## Related code files

- Create: `supabase/migrations/*.sql`, `supabase/seed.sql`, `src/lib/supabase.ts`, `src/lib/database.types.ts`, `src/lib/list-query.ts` (shared params/response schemas + Supabase range/count/search builder), `src/features/*/api/*`, `src/features/*/schemas/*`, `src/features/*/constants/*-keys.ts`, `src/mocks/handlers/*`, `src/mocks/fixtures/*`, `src/mocks/lib/apply-list-query.ts` (MSW filter/search/sort/slice mirroring the same contract).
- Modify/replace: `src/lib/axios.ts` (retire — **moved from `config/` in Phase 01**, since a
  configured client is `lib/`, not `config/`), `src/stores/auth.ts` (Supabase session),
  `src/features/auth/api/*`.
- **Re-add `@faker-js/faker` as a `devDependency` when seeding starts.** Phase 01 removed it: it
  was declared in `dependencies` (wrong bucket — it never ships to users) and imported by exactly
  zero files. Seed/MSW fixtures are its first real use.
- **`setMutationDefaults()` at module scope is in 11 files, not 1** as Phase 01's note implied
  (every `features/*/hooks/mutations/*`). Importing a hook mutates the shared `queryClient` as a
  side effect, and each file imports the singleton _and_ calls `useQueryClient()`. This phase
  rewrites these hooks into `api/` — take the chance to kill the pattern rather than port it.
- **Hardcoded Vietnamese to localize while rewriting**: `lib/axios.ts:39,45` (the 401/403 session
  notices) and `features/auth/api/auth-api.ts:16`. Both files are replaced here anyway.
- **Delete `src/types/index.ts` here.** It is the legacy **.NET** contract — `BaseResponse<T>`
  (`Data`/`TotalRecord`/`StatusCode`/`Message`), `BaseEntity` (C# audit columns), and
  `BaseSearchParams`. PascalCase because it mirrors the C# DTOs, so it is a correct description of
  a backend this phase deletes, not a naming bug — which is exactly why Phase 01 did **not**
  rewrite it to camelCase: that would have meant inventing types for an API that stops existing
  here. Supersede with per-feature `schemas/` (`z.infer`, row→domain camelCase transform). Phase 01
  already deleted the 4 members that had zero usages (`BasePaginationParams`, `BaseParams`,
  `BaseFilterParams`, `OptionValue`); the 3 that remain have 22 call sites between them and die
  with the axios layer.
- **Drop the `X_DEVICE_UDID` header.** `auth-api.ts:10` hardcodes a zero GUID
  (`'00000000-0000-0000-0000-000000000000'`) for a .NET-only device header. It is meaningless to
  Supabase — do not port it.
- **Delete `src/utils/regexes.ts` here too — the whole file.** Both surviving patterns validate
  fields that stop existing in this phase: `profiles` is `id · email · full_name · avatar_url ·
created_at`, so there is **no `username`** (auth is email/OAuth — Supabase has no username
  concept) and **no `phone`**. Nothing to validate, and nothing to colocate into `schemas/` either
  — the one field that survives is covered by `z.email()`. Note this is **earlier** than a
  Zod-migration reading of the plan suggests: the file dies with the .NET user model here, not
  with the forms in Phase 05.
  - Phase 01 already deleted the 3 dead patterns (`email`, `iso8601Regex`, `approver` — the last
    being an `email|name` format from an unrelated older project) and fixed a **live** bug in
    `phone`: `[3|5|7|8|9]` treats `|` as a literal character inside a character class, so
    `0|12345678` validated as a phone number, and the missing `^...$` anchors let
    `abc0912345678` through. Both confirmed against antd's own `async-validator`.
  - If a later phase ever needs real phone validation, do not hand-roll a regex: a self-written
    pattern is correct for exactly one country at one point in time and breaks when a carrier adds
    a prefix. Use `libphonenumber-js` and store E.164 — and if the number actually matters, verify
    it with an OTP rather than a pattern.

## Implementation steps

1. Init Supabase (local); write migrations (enums → tables → **filter/FTS indexes** → RLS → `has_permission`).
2. Seed roles/permissions/demo data; enable pgvector (embedding column nullable for now). Seed enough tickets (~500+) that pagination/search are actually exercised, not just visually present.
3. Generate DB types; build `supabase.ts` client + typed helpers.
4. Define Zod schemas (row→domain camelCase transform) per feature; derive TS types.
5. Build `src/lib/list-query.ts`: params/response schemas + the Supabase range/count/order/textSearch builder (contract above).
6. Build query-key factories + `queryOptions` factories (list params are **part of the query key** — each page/filter combo is its own cache entry, which is what makes `keepPreviousData` work); rewrite query/mutation hooks (optimistic + invalidate).
7. Write MSW handlers + shared fixtures returning identical shapes, incl. the shared list-query applier; wire `VITE_API_MODE` switch.
8. Migrate auth to Supabase session (sign-in/out, session persistence, token refresh handled by SDK).

## Todo

- [x] Migrations (16 tables + enums + filter/FTS indexes) + RLS + has_permission + pgvector
      — 7 migrations. Two things the spec did not anticipate, both found by attacking the schema
      rather than reading it: RLS is inert without table `GRANT`s, and a permission-only UPDATE
      policy matches **every** row (Postgres applies the SELECT policy to an UPDATE only when the
      statement reads columns), so ticket visibility now lives in one shared `can_access_ticket()`.
      Also: default ACLs hand `anon` TRUNCATE on arrival, which RLS does not cover — revoked.
      `ticket.assign` dropped (RLS cannot gate a single column); agent has no `user.read.all`.
- [x] Seed roles/permissions/demo/tickets (~500+ tickets so pagination/search are real)
      — 3,671 rows: 52 users (4 demo accounts), 500 tickets, 1,020 messages (106 internal notes),
      1,210 events. Generated from `src/mocks/fixtures/` (the source MSW will share) via
      `bun run seed:gen`; `seed:check` fails CI on drift. Attachments deliberately unseeded — the
      rows would point at Storage objects that do not exist until Phase 06.
- [x] Generated DB types + supabase client
      — `bun run db:types` → `src/lib/database.types.ts`; `src/lib/supabase.ts` typed with `Database`,
      SDK owns session/refresh. `VITE_API_MODE` switched `live`→`supabase`; anon key required only in
      that mode (msw needs none). `vitest.config` pins `VITE_API_MODE=msw` so CI (no `.env.local`) does
      not throw on `env.ts`'s new refinement.
- [~] Zod schemas + camelCase domain mapping
  — pattern established + proven on the reference case: `features/tickets/schemas/` (enums derived
  from generated `Constants`; row→domain camelCase `.transform`, `search_vector`/`embedding`
  dropped; input schema pinned to `Tables<'tickets'>` so a migration drift fails typecheck). The
  remaining feature schemas (auth/admin) land in Stage 3 **with** their api rewrite — schema + fetcher
  change together, reviewed together.
- [x] Shared list-query contract (`list-query.ts`): params/response + range/count/order/textSearch builder
      — `lib/list-query.ts` (Zod params/response, pageSize allowlist, page/q coercion, range+pageCount
      math) + `lib/list-query-builder.ts` (Supabase FTS→trgm fallback, sort allowlist + total-order
      tiebreaker, `ilike` wildcard escaping). 16 unit tests on a fake builder; proven end-to-end against
      live Supabase (admin 500 vs customer RLS ~14, FTS `refund`, `invoic` fallback, page-2 zero overlap).
- [x] Query-key + queryOptions factories (list params in key), hooks rewritten
      — admin (users/roles/permissions) + tickets. Fetcher + queryOptions + hook colocated in `api/`;
      the old `hooks/queries` + `hooks/mutations` split and the 11 module-scope `setMutationDefaults`
      are gone. Reads use `.throwOnError()` (SDK's own bridge; preserves `PostgrestError`) not a
      hand-rolled unwrap. Admin CRUD UI (26 antd components) deleted — data model diverged from the
      schema and Phase 05/06 rebuilds them; admin pages are read-only lists on the new layer for now.
- [~] MSW handlers + fixtures + shared list-query applier, VITE_API_MODE switch
      — **applier + parity done; app-facing wiring deferred to Phase 06** (user-approved lean scope +
      Approach A: msw-mode data comes from `apply-list-query` over fixtures, not a PostgREST emulation).
      `src/mocks/lib/apply-list-query.ts` mirrors the Supabase builder (filter→search→sort→slice) and a
      parity test (`bun run test:parity`, needs local stack) asserts identical `{rows,totalCount,pageCount}`
      across filter/enum-order-sort/FTS/fallback/pagination. `VITE_API_MODE` enum switched to
      `supabase|msw` in Stage 2; client already msw-safe. The dataClient mode-branch that routes the
      feature apis to the applier in msw mode lands in Phase 06 with the screens that consume it.
      **Parity caught a real Stage-2 FTS bug:** `.textSearch()` omitted the config, defaulting supabase-js
      to `'english'` against a `'simple'` tsvector — every stemmed word ("invoice"→"invoic") silently
      FTS-missed and fell to trigram. Fixed by carrying `searchConfig: 'simple'` on the list config.
- [x] Supabase auth session (retire axios auth)
      — SDK owns session/refresh; store mirrors `onAuthStateChange` (no hand-rolled tokens). Email/
      password + Google OAuth entry. axios, `types/index.ts`, `regexes.ts`, `VITE_BASE_API_URL` all
      deleted; the 3 hardcoded Vietnamese strings died with the files that held them.

## Success criteria

Same feature hooks work against MSW and Supabase unchanged; RLS blocks cross-role access (tested); tests run fully on MSW without network. **List parity test passes:** identical params → identical `{ rows, totalCount, pageCount }` from MSW and Supabase, incl. filter+search+sort combined.

## Stage 4 review follow-ups (accepted, not fixed)

- **`searchConfig` is optional on the list config.** A future FTS table that forgets to set it
  re-triggers the english-stemmer-vs-simple-column bug. Left optional because the tickets parity test
  is the guard, and tickets is the only FTS list; revisit if a second FTS list appears.
- **Applier compares an exact count against Supabase's `count: 'estimated'`.** They agree at seed scale
  (the estimate is exact at 500), so the parity test is valid today. If the corpus grows past where the
  planner estimate diverges, the totalCount assertion could flake — which would correctly reflect a real
  MSW-vs-Supabase divergence, since `estimated` is a deliberate perf choice. Bound noted, not a bug.

## Stage 3 review follow-ups (open)

- **Filter values are unvalidated against their column domain** (`ticket-api.ts` `applyFilters`).
  Injection is impossible — `.eq`/`.in` treat a crafted string as one literal (confirmed) — but an
  invalid enum/uuid value (`status=open,resolved`) raises Postgres `22P02`, which `runListQuery`
  rethrows to the error boundary. **This is a Stage 4 parity requirement, not just a Phase 04 one:**
  Supabase errors on a bad enum value while the in-memory MSW applier would return empty, so the two
  sources diverge unless the value is validated out at the boundary. Decide in Stage 4 — a ticket
  filter schema that rejects values outside `ticket-enums` before dispatch is the shared fix.
- **Raw `PostgrestError.message` is rendered to the UI** (admin read-only pages). Leaks table/column
  names (`permission denied for table profiles`). Admin-only now → low; add a generic fallback in
  Phase 06 before the customer-facing ticket screens inherit the pattern.

## Risks

- RLS complexity — write pgTAP or integration tests for policy correctness.
- Keeping MSW fixtures in sync with schema — generate both from one fixture source.
- **RLS interacts with `count`:** the count reflects only rows the caller may see. Verify a customer's `totalCount` matches their own visible tickets (not the global total) — a leaked total is an information disclosure, and a wrong one breaks `pageCount`.
- MSW list logic drifting from the SQL behavior (esp. search + sort tiebreaker) — parity test is the guard.
