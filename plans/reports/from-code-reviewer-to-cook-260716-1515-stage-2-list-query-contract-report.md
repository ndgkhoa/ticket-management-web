# Stage 2 review — Supabase data-layer foundation (list-query contract)

**Reviewer:** code-reviewer · **Date:** 2026-07-16 · **Branch:** develop
**Verdict:** Ship-ready. All 6 priority concerns verified CORRECT against live Supabase. Two Medium hardening items for Stage 3, plus minor notes. No blocking defects.

## Scope
- src/lib/list-query.ts, list-query-builder.ts, list-query.test.ts
- src/lib/supabase.ts, src/config/env.ts, .env.example, vitest.config.ts
- src/features/tickets/schemas/ticket-enums.ts, ticket-schema.ts
- Reviewed *usage* of generated database.types.ts (not its content).

## Verification method
- `bunx tsc -b` (0 errors), `bun run test` (33 pass), `bunx eslint` scoped (0).
- CI sim: `mv .env.local` → suite green → restored.
- Live: temporary vitest under src/ (server.close(), signed in as demo users) against running local stack (~500 seeded tickets). All temp files deleted; `git status` restored to baseline (6 modified + new Stage-2 files, nothing else).

---

## CONFIRMED — the 6 priority concerns are all correct

**P1 pagination math + no-duplicate (live, admin, sort by non-unique `status`, pageSize 50):**
`STATUS-SORT total=500 pages=10 uniqueIds=500 dupes=0`. The `created_at desc, id desc` tiebreaker gives a total order; every page disjoint, full set covered. `pageToRange`/`computePageCount` boundaries proven by unit tests (page1, exact multiple, empty→"1 of 1").

**P1 RLS-filtered count (`count:'estimated'`):** admin `totalCount=500`; customer `totalCount=14` and `exact count=14` — customer sees only their own total, never the global 500. No information disclosure; `pageCount` derived from the RLS total.

**P2 FTS → trgm fallback (live):**
- `invoic` → FTS `count=0` → retries trgm → `67` (`runListQuery total=67`). Fallback fires exactly on empty FTS.
- `refund` → FTS `count=13` (≠0) → no second query. No wasted trgm pass.
- `escapeLike`: `q='%'` → `total=0` (global 500); `q='_'` → `total=0`. Wildcards neutralised; not match-all. Regex `/[\\%_]/g` escapes `\ % _` in one pass — complete for PostgREST `ilike`.

**P3 env + CI safety:** suite green with `.env.local` absent (msw mode needs no Supabase vars; `vitest.config` pins `VITE_API_MODE=msw`, discharging the refinement). Refinement message for missing supabase-mode vars is clear and actionable.

**P4 structural typing of the builder:** the REAL `supabase.from('tickets').select(TICKET_COLUMNS,{count:'estimated'})` satisfies `SupabaseListQuery<Row>` with **no cast** — `tsc -b` green on a real no-cast call (proved the temp file was in the graph via a deliberate `TS2322`). The `as never` in list-query.test.ts is only because the *fake* builder is partial; a real Stage-3 ticket api needs no cast.

**P5 `satisfies` drift guard:** catches all three drift classes — rename (`subject`→`subjectX`: TS1360+TS2551), widen (`status: z.string()`: TS1360), drop (`due_at` removed: TS1360+TS2339). `search_vector`/`embedding` excluded from both schema and `TICKET_COLUMNS`; a live seeded row parses to camelCase with **zero** snake_case keys (`requesterId,assigneeId,...` — `SNAKE keys=(none)`).

**P6 supabase.ts assertions:** the `!` on the env vars are genuinely discharged by the refinement in `supabase` mode — safe. (But see M1: the comment about msw mode is wrong.)

---

## Findings

### M1 — [Medium] supabase.ts comment misstates the msw-mode failure mode (propagates to Stage 3)
`src/lib/supabase.ts:16-17` claims that if the module were imported in msw mode "an unconfigured client would fail on first use with a clear network error rather than at import." **False.** Verified: `createClient(undefined, undefined)` throws `supabaseUrl is required.` **at construction / import time**, not lazily on first request.
- Code is correct today (nothing imports supabase.ts yet — grep confirms). The risk is the *guidance*: Stage 3's `dataClient` indirection could trust this comment and statically `import { supabase }` on a msw-reachable path, crashing the app at boot in msw/demo/test mode instead of degrading.
- **Fix:** correct the comment; ensure Stage 3 constructs/imports the Supabase client lazily behind the mode switch (dynamic import or factory), never at module scope on a path msw mode reaches.

### M2 — [Medium] `count:'estimated'` is the caller's job but unenforced — silent `totalCount=0`
`runListQuery` reads `count` off the response; it cannot verify `buildBase` passed `{count:'estimated'}`. Proven live — a select **without** the option:
`NOCOUNT rows=20 totalCount=0 pageCount=1` — 20 real rows render while pagination reports 0 results / 1 page.
- Every Stage-3 screen (~8) writes its own `buildBase`; forgetting the option is a one-token mistake with a silent, wrong-not-crashing outcome (`count ?? 0` → `computePageCount(0)=1`). JSDoc mentions it, but nothing type-guards it.
- **Fix options:** provide a `selectList(table, cols)` helper that always sets the count option, or a dev-mode assert in `runOnce` when `count == null && data.length === pageSize` (ambiguous total), or encode the requirement in the buildBase type.

### L1 — [Low] `filters` accepted but never applied by the builder
`listParamsSchema.filters` is parsed and passed into `runListQuery`, which ignores it entirely — filters must be applied by the caller inside `buildBase` (per JSDoc). Defensible (filters are table-specific `.eq(...)`), but: (a) a Stage-3 dev may expect `runListQuery` to apply them; (b) Stage-4 MSW parity must replicate filter logic that lives *outside* the shared contract — the exact drift the phase's parity test is meant to prevent. Recommend an explicit note at the `runListQuery` call sites and in the Stage-4 applier.

### L2 — [Low] `page` has no upper bound
`page: z.coerce.number().int().positive().catch(1)` — `pageSize` is allowlisted (good) but `page` is unbounded. `?page=1000000000` forces a deep offset. Postgres returns empty cheaply past the set and the spec acknowledges deep-offset degradation, so low risk. Consider clamping `page` to `pageCount` in the response/UI layer.

### L3 — [Informational] FTS `simple` config = no stemming (schema, Stage 1 — out of scope)
`search_vector` uses `to_tsvector('simple', ...)`, so `"refunds"` won't FTS-match `"refund"`; it falls to trgm-on-`subject` only (misses `description` hits). Affects search quality on every list screen. Not a Stage-2 code defect — noting because it shapes what Stage 3/QA should expect from keyword search.

---

## Positive observations
- The tiebreaker de-dup (`tiebreakers.filter(t => t.field !== primary.field)`) correctly avoids double-ordering the same column while preserving a total order — verified across a full non-unique-sort pagination sweep.
- Sort allowlist genuinely drops non-allowlisted columns (`embedding`) back to default — unit-proven and matches the "no arbitrary `.order()` column" security intent.
- Enums derived from generated `Constants` (not hand-retyped) — a new Postgres enum value flows in on `db:types` regen.
- Factory-not-builder for `buildBase` correctly gives the trgm fallback a fresh single-use query.
- Files well under the 200-LOC standard (118 / 153 / 77).

## Metrics
- tsc: 0 errors · eslint (scoped): 0 · tests: 33/33 · live probes: 9/9 + 1 footgun probe.

## Unresolved questions
1. M2: preferred enforcement for the count option — helper, type, or dev-assert? (affects Stage-3 api ergonomics)
2. L1: will Stage-4's MSW applier share filter logic with the SQL path, or reimplement? Parity risk sits here.
3. Is the `simple` FTS config (L3) intentional, or should it move to a stemming config before Stage 3 QA?
