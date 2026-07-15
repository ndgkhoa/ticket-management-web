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
- Modify/replace: `src/config/axios.ts` (retire), `src/stores/auth.ts` (Supabase session), `src/features/auth/api/*`.

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
- [ ] Migrations (16 tables + enums + filter/FTS indexes) + RLS + has_permission + pgvector
- [ ] Seed roles/permissions/demo/tickets (~500+ tickets so pagination/search are real)
- [ ] Generated DB types + supabase client
- [ ] Zod schemas + camelCase domain mapping
- [ ] Shared list-query contract (`list-query.ts`): params/response + range/count/order/textSearch builder
- [ ] Query-key + queryOptions factories (list params in key), hooks rewritten
- [ ] MSW handlers + fixtures + shared list-query applier, VITE_API_MODE switch
- [ ] Supabase auth session (retire axios auth)

## Success criteria
Same feature hooks work against MSW and Supabase unchanged; RLS blocks cross-role access (tested); tests run fully on MSW without network. **List parity test passes:** identical params → identical `{ rows, totalCount, pageCount }` from MSW and Supabase, incl. filter+search+sort combined.

## Risks
- RLS complexity — write pgTAP or integration tests for policy correctness.
- Keeping MSW fixtures in sync with schema — generate both from one fixture source.
- **RLS interacts with `count`:** the count reflects only rows the caller may see. Verify a customer's `totalCount` matches their own visible tickets (not the global total) — a leaked total is an information disclosure, and a wrong one breaks `pageCount`.
- MSW list logic drifting from the SQL behavior (esp. search + sort tiebreaker) — parity test is the guard.
