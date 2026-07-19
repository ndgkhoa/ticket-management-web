# Stage 3 Supabase Migration — Code Review (production-readiness)

Reviewer: code-reviewer | Date: 2026-07-17
Range: `e720a88..HEAD` (5 commits) | Branch: develop
Verification: LIVE local supabase (500 tickets / 52 profiles), GoTrue, tsc/lint/test all executed.

## Verdict

Clean, well-reasoned stage. **No Critical, no High.** Auth lifecycle, filter allowlist,
schema faithfulness, msw-safe client, `.throwOnError` propagation, and deletion completeness
all CONFIRMED correct against live data. Four Medium/Low forward-looking notes below.

Gates: `bunx tsc -b` EXIT 0 · `bun run lint` clean · `bun run test` 34/34 · tests still 34/34
with `.env.local` MOVED AWAY (CI-safe). `git status` clean after probes removed.

---

## CONFIRMED — findings (ranked)

### M1 — Filter allowlist validates the KEY but not the VALUE; a crafted enum/uuid filter blanks the list with a 400 (not injection)

`src/features/tickets/api/ticket-api.ts:34-58`

Injection is NOT possible — CONFIRMED. `.eq`/`.in` pass the crafted string as a single
literal; PostgREST parameterises it. Proof (live, signed in as admin):

- `filters:{status:'open,resolved'}` → `Error: invalid input value for enum ticket_status: "open,resolved"` (does NOT match both statuses).
- `filters:{status:['open','status.eq.closed',')']}` → errors on the bad enum member; does NOT smuggle a `.eq` operator.
- Unknown key ignored: unfiltered total **500** == `{evil_col:'x','; drop':'y'}` total **500**.
- Known key constrains: `status='open'` → **86** rows, distinct statuses `['open']`.

The residual issue: the allowlist gates which _column_ is filterable but never checks the
_value_ against that column's domain. A crafted value on an enum column (`status`,
`priority`, `channel`) or uuid column (`assignee_id`, `team_id`, `category_id`) throws a
Postgres 22P02, which `runOnce` (`list-query-builder.ts:112`) rethrows → React Query error →
error boundary. Today unreachable (filters aren't URL-wired yet), but Phase 04/06 wires
`?filters[status]=…` from the URL: one malformed param then blanks the whole ticket list
with an error instead of showing "no results" or ignoring the bad value. One bad value inside
a multi-select `.in` array errors the entire query.

Fix before filters go URL-driven: validate filter values against the ticket enum schemas
(reuse `ticket-enums`), OR have `applyFilters`/`runOnce` treat a 22P02 as an empty result.

### M2/L1 — Raw PostgrestError text surfaced to the UI (internal-detail leak)

`src/features/admin/users/pages/users.tsx:41` (`<ErrorPage subTitle={userQuery.error.message} />`); same shape reachable via the M1 errors.

`.throwOnError()` deliberately preserves the full `PostgrestError` (message/detail/hint) — good
for logs, but `error.message` is rendered verbatim. The M1 enum error leaks the column and enum
type name (`ticket_status`); an RLS denial leaks `permission denied for table profiles`
(CONFIRMED as anon). Admin-only surface today, so Low, but it's a pattern worth a generic
fallback ("Something went wrong") with the detail kept to logs/devtools.

### L2 — `getSession()` has no `.catch`; leaving `loading` relies on the SDK's INITIAL_SESSION event

`src/stores/auth.ts:56-58`

If the `getSession()` promise ever rejects, the `.then` never fires and `status` would stick at
`loading` → `ProtectedRoute` shows the fullscreen spinner forever. In practice `onAuthStateChange`
fires `INITIAL_SESSION` on subscribe and also calls `setSession`, so the store still leaves
`loading` — belt-and-suspenders, CONFIRMED working (probe: `loading` → `unauthenticated`). But
the redundancy is implicit; a `.catch(() => setSession(null))` makes the guarantee explicit and
cheap. Low.

### L3 — `authApi.signOut` and `authApi.signInWithGoogle` are unused; sign-out bypasses `authApi`

`src/features/auth/api/auth-api.ts:15-23`

`authApi.signInWithPassword` is used (via `use-sign-in`). `authApi.signOut` is dead — the store
calls `supabase.auth.signOut()` directly (`stores/auth.ts:44`), so the "one path in, one source
of truth" comment on `authApi` is only half true for sign-out. `authApi.signInWithGoogle` is dead
(the Login Google button shows `FeatureComingSoon`). Intentional deferral for the UI rebuild;
noting so it isn't forgotten. No bug.

---

## CONFIRMED correct (empirical) — no action

1. **Auth cannot be bypassed.** Guards gate on `status`; `AppRoutes.tsx` wraps `MainLayout`
   (`/`, `/admin/*`) in `ProtectedRoute` and `/auth/*` in `AuthLayout`. RLS is the real backstop:
   as anon, `tickets` and `profiles` reads both return `permission denied` (CONFIRMED). Defense in
   depth holds even if a guard were wrong.
2. **`loading` resolves correctly.** Probe: store starts `loading`, `subscribeToAuth` → `unauthenticated`
   (no persisted session), sign-in → `authenticated` userId `…0002`.
3. **signOut fully clears — no residual token.** After `signOut`: store `status=unauthenticated`,
   `session=null`, `user=null`; SDK `getSession()` → null; `localStorage['ticket-management-auth']` → **null (removed)**. The old hand-rolled-token leak class is gone.
4. **GoTrue.** Good password → `access_token` (sub `…0002`). Wrong password → `400 invalid_credentials`.
5. **Filter injection impossible / allowlist works** — see M1 proof.
6. **Schema ↔ generated-type drift: none.** All four row schemas match `database.types.ts` nullability
   (profiles `full_name`/`avatar_url` nullable; roles/permissions `description` nullable; ticket
   `description` NOT NULL, fk/`*_at` nullable). Live rows parse: ticket domain output is 100% camelCase
   (zero `_` keys, CONFIRMED); 52 profiles parse through `z.email()` with no rejects; `search_vector`/
   `embedding` correctly excluded from `TICKET_COLUMNS` and the `Omit<>` type.
7. **msw-safe client uses REAL env in supabase mode.** Probe logged `supabaseUrl = http://127.0.0.1:54321`
   — the `http://msw.local` placeholder only stands in when the vars are absent (msw mode). No risk of
   contacting the placeholder host in supabase mode.
8. **`.throwOnError()` throws and reaches React Query.** `detail('…deadbeef')` (missing) and
   `detail('not-a-uuid')` (malformed) both reject; anon reads throw `permission denied`. Errors are not
   swallowed.
9. **Deletion left no gap.** Zero dangling refs to `lib/axios`, `types/index`, `utils/regexes`,
   `auth-keys`, `AuthProviders`, `use-login-with-*` (grep clean; tsc clean). `mocks.test.ts` is
   meaningful — 3 real assertions (intercept 200, failure-path 500, header passthrough) against live
   MSW; with `onUnhandledRequest:'error'` they'd fail loudly if wiring broke.

---

## Notes on my own claims

- M1's "not injection" is the sticky verified result; the audit angle here is a _robustness/leak_
  gap one step away from where injection was suspected, not a reversal.
- AppRoutes.tsx is out of scope (Phase 04) but READ to confirm the in-scope guards are wired.

## Unresolved questions

1. M1: should invalid filter values be **rejected at the URL schema** (`validateSearch`, Phase 04)
   or **absorbed** in `applyFilters` (catch 22P02 → empty)? Pick one before filters go URL-driven.
2. M2/L1: is surfacing raw Postgres error text acceptable on admin-only screens, or do you want a
   generic fallback now so the pattern doesn't propagate to customer-facing ticket screens?
