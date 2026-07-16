# Stage 4 MSW-parity review — is the parity guarantee real?

Reviewer: code-reviewer. Date: 2026-07-17. Range: `e720a88..HEAD`, commit `e007814`.
Stack: local Supabase running, 500 seeded tickets. All findings below marked CONFIRMED were executed against the live stack; `git status` ends clean (only this report added).

## TL;DR

The parity test is a **REAL guard, not a vacuous one** — I broke the applier 3 independent ways and every break went red (proof the Supabase side is the genuine live, authenticated path, not a second copy of the applier). BUT the 13 cases **miss the two dimensions where the applier actually diverges from Supabase**: FTS tokenization of hyphenated/unicode terms, and null placement in a nullable sort. Both are masked by the current seed, so the guard is green while a real divergence exists. Net: guarantee is **real but incomplete**.

---

## Parity test IS a real guarantee (crux question 1a) — CONFIRMED

Broke the applier three ways, ran `bun run test:parity` each time:

| Break (file:line) | Result |
|---|---|
| Flip sort direction — `apply-list-query.ts:111` `dir==='asc' ? -cmp : cmp` | **13/13 RED** |
| Remove FTS→trgm fallback — `apply-list-query.ts:141` `result = ftsMatches` | **1 RED** (`search q=payme`) |
| Enum sort → string order (`status: r => r.status` in test config) | **1 RED** (`sort status asc`) |

If the Supabase side were secretly the applier (doMock failure, swallowed error), breaking the applier would keep both sides equal → green. It went red. Also: `beforeAll` throws on sign-in error, `runOnce` throws on query error, `server.close()` disables MSW, and an un-authed client would hit RLS and return 0 rows ≠ applier. **No vacuous-pass path found.** Harness is sound.

---

## Findings, ranked

### HIGH-1 — FTS tokenizer diverges on hyphenated words; masked by seed (crux 2) — CONFIRMED

`apply-list-query.ts:41-48` tokenizes with `split(/[^a-z0-9]+/)`. Postgres `to_tsvector('simple')` does NOT split hyphenated alphabetic words into only their parts — it emits **compound + parts** (`sign-in` → `sign-in`, `sign`, `in`), and `websearch_to_tsquery('simple','sign-in')` becomes the phrase `'sign-in' <-> 'sign' <-> 'in'`. The JS tokenizer can never produce the `sign-in` lexeme, so `matchesFullText` returns false for every row → applier FTS = 0 → falls to trgm over **subject only**.

Concrete divergence (SQL + end-to-end applier run):

```
q = "time-sensitive"
  Postgres FTS (search_vector = subject+description):  27 rows
  applier:                                              0 rows
```

Verified end-to-end via a temp integration test (now deleted): `ticketApi.list({q:'time-sensitive'}).totalCount = 27`, `applyListQuery(...).totalCount = 0`. The word lives only in descriptions; the applier's hyphen-tokenization miss drops it to a subject-only trgm scan that finds nothing.

`sign-in` (20) and `two-factor` (18) happen to match (those words appear in *subjects*, so the subject-only trgm fallback coincidentally equals the FTS count). Corpus has 122 rows with hyphenated words (`sign-in`, `two-factor`, `one-off`, `month-end`, `time-sensitive`). A help-desk user WILL search these. When search is wired to the UI (Phase 06), demo (MSW) and prod (Supabase) return different result sets for the same query.

Impact: real correctness gap, not a demo-only curiosity. **Fix options:** (a) mirror Postgres hyphen handling in `tokenize` (also emit the compound token and the leading-hyphen numeric form), or (b) accept the gap explicitly and add hyphenated-word cases to the parity matrix so it's a known, asserted divergence rather than a silent one. The bare-number case is also affected: PG keeps `-18905` as the lexeme, JS produces `18905`; `websearch('18905')` FTS-misses in PG but the applier's tokens contain `18905` — currently same count only because no 5-digit number appears in any description.

### HIGH-2 — `compareRows` null placement contradicts Postgres for DESC; parity test structurally cannot catch it (crux 4) — CONFIRMED

`apply-list-query.ts:107-109` forces **nulls last for every direction**, with a comment claiming this "matches Postgres default for DESC ordering." That claim is false. PostgREST/Postgres default is NULLS **LAST for ASC, NULLS FIRST for DESC** (no `nullsfirst` is emitted — builder `list-query-builder.ts:92` calls `.order(field,{ascending})` only).

Proof (live PostgREST, `resolved_at` has 204 nulls):
```
GET /rest/v1/tickets?order=resolved_at.desc  → first 3 rows all resolved_at=null  (NULLS FIRST)
applier compareRows for desc                 → nulls forced to the end            (NULLS LAST)
```

Why the parity test stays green: the only **nullable + sortable** column is `due_at`, and the seed has **due_at 500/500 non-null** (zero nulls). `created_at`/`updated_at` are NOT NULL; `resolved_at`/`first_response_at` are nullable but not in `sortableFields`. So the null branch is never exercised. `due_at` is nullable in schema — the moment a ticket exists without a due date and someone sorts by `due_at desc`, page 1 rows differ between demo and prod (nulls at opposite ends → different tiebreak-ordered rows across pages).

**Fix:** make `compareRows` direction-aware (asc → nulls last, desc → nulls first) to match Postgres default, OR pin the builder with explicit `nullsFirst` and mirror that constant in the applier. Then add a `due_at`-with-nulls fixture + parity case. Correct the misleading comment either way.

### MEDIUM-1 — 13 cases miss the combination dimensions that break sorts/paging — SUSPECTED

Coverage gaps (none currently red, but they're where the remaining divergences would hide):
- No **search + sort** case (e.g. `q=refund` + `sort priority desc`) — search changes the set, then the enum-tiebreak sort runs over it; untested.
- No **search + filter + sort** triple.
- No **page beyond last** / last-page-of-a-filtered-search (keepPreviousData paging over a short result).
- No **null in the sorted column** (blocked by seed — see HIGH-2).
- `page 2` uses default pageSize 20; no non-default pageSize case, and pagination bugs often only appear at page N>1 of a *non-unique* primary sort (status/priority) — the `combined` case sorts priority desc but only checks page 1.

Add a handful of these; they're cheap and target exactly the untested interactions.

### LOW-1 — `searchConfig` is optional in the type; same silent-english trap for the next table — SUSPECTED

`list-query-builder.ts:50` types `searchConfig?: string`. Tickets sets `'simple'` (fix confirmed correct — see below), but a future table that sets `searchColumn` and forgets `searchConfig` re-introduces the exact bug this stage fixed: supabase-js defaults to `'english'`, stems, and silently FTS-misses. Consider making config required whenever `searchColumn` is present (type-level or a runtime assert in `runOnce`).

### LOW-2 — `count: 'estimated'` vs applier's exact count is a latent parity flake — CONFIRMED (currently benign)

Applier returns exact `result.length`; Supabase uses `count: 'estimated'`. On the seeded+analyzed 500-row table the estimate is exact (`Content-Range: 0-499/500`), so all 13 cases pass. On a large or freshly-bulk-inserted (un-ANALYZEd) table the planner estimate diverges from exact → the parity test would flake AND real `totalCount` would be approximate while the demo is exact. This is arguably by-design (estimated chosen for debounced-search perf, per builder comment), but worth an explicit note so a future flake isn't mistaken for a real applier bug.

---

## Confirmed correct (no action)

- **FTS config fix (crux 3):** `searchConfig: 'simple'` now flows to `.textSearch(..., {type:'websearch', config:'simple'})`. Verified the bug was real and the fix necessary: `websearch_to_tsquery('english','invoice')` = `'invoic'` → **0** FTS rows; `'simple'` → `'invoice'` → **89** rows. Only one `textSearch` call site in `src/` — fix is complete. Does not regress the blank-q skip (schema collapses `''`→undefined upstream) or the trgm fallback (config-independent).
- **Trgm fallback set (crux 5):** `apply-list-query.ts:141` `result.filter(trgm)` runs over the already-filtered set (RHS evaluated before reassignment), matching `runListQuery` re-running trgm over the filtered `buildBase`. Filter semantics (unknown key ignored, array→includes, scalar→eq) match `ticket-api.ts:56-61`.
- **Enum-order sort:** applier maps enum columns to ordinal; break test proved it's genuinely asserted. `Constants.public.Enums.*` order matches Postgres enum definition order (baseline green on `sort status/priority`).
- **uuid tiebreaker:** JS string `<` on lowercase-hex, fixed-hyphen-position uuids matches Postgres uuid ordering; `id desc` tiebreak used in all 13 cases, green.
- **RLS/admin visibility:** admin sees all 500 (default case totalCount parity holds), so the applier's full-fixture run is the right comparand.

---

## Verification commands (reproducible)

```
bun run test:parity                                   # 13/13 green baseline
# hyphen divergence:
docker exec -i supabase_db_ticket-management-web psql -U postgres -d postgres -c \
 "select (select count(*) from tickets where search_vector @@ websearch_to_tsquery('simple','time-sensitive')) as pg_fts,
         (select count(*) from tickets where subject ilike '%time-sensitive%') as applier;"   # 27 vs 0
# null placement:
GET /rest/v1/tickets?order=resolved_at.desc&limit=3   # nulls first (applier = nulls last)
# fts config bug:
psql -c "select count(*) from tickets where search_vector @@ websearch_to_tsquery('english','invoice');"  # 0
psql -c "select count(*) from tickets where search_vector @@ websearch_to_tsquery('simple','invoice');"   # 89
```

---

## Unresolved questions

1. Is FTS search meant to be reachable from the demo/MSW UI in Phase 06, or Supabase-only? If demo never issues `q`, HIGH-1 downgrades to "document as known divergence"; if it does, the tokenizer needs to mirror PG hyphen handling.
2. Will `due_at` ever be null in seed/prod? Schema allows it. If yes, HIGH-2 is a live bug the moment someone sorts by it; if `due_at` is contractually always-set, it's just a wrong comment + a coverage gap.
3. Is Vietnamese content actually coming? Schema comment says "mixed en/vi" but current seed has zero non-ASCII in tickets. If vi content lands, `split(/[^a-z0-9]+/)` shreds diacritics (`toán`→`to`,`n`) while PG 'simple' keeps `toán` whole — same class of bug as HIGH-1, larger blast radius.
