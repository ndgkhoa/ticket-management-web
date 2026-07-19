# Phase 02 (Testing & CI) — Retrospective Audit

Date: 2026-07-16 · Reviewer: code-reviewer · Branch `develop` · Range `2c898f5..6ea3f62`

**Verdict:** The safety net is largely real. 17/17 unit tests are genuinely effective
(proven by mutation), MSW `onUnhandledRequest:'error'` fires, the coverage floor bites,
e2e runs green against the production build, and CI steps fail correctly. The lockfile is
committed and CI installs `--frozen-lockfile`. **One meaningful blind spot** found that the
phase file did NOT record: the **sign-in a11y test cannot catch any colour-contrast
regression** — the exact failure class the tooling was chosen for. Plus two documented-but-
worth-restating "the net is advisory" facts.

Everything below marked CONFIRMED was executed. `git status` is clean; every temporary
mutation was restored via `git checkout --`.

---

## FINDINGS (ranked)

### F1 — MEDIUM/HIGH · CONFIRMED · Sign-in a11y test is contrast-blind (false confidence)

**Files:** `e2e/a11y.spec.ts:19-29`, `src/features/auth/pages/sign-in.tsx:13`, README.md:70-73

The sign-in page paints its background with absolutely-positioned `::before`/`::after`
pseudo-elements at `-z-10` (`sign-in.tsx:13`). These are not DOM ancestors of the text, so
axe cannot resolve the effective background behind any text on the page and returns
`color-contrast` as **incomplete**. The a11y test reads only `violations`, never
`incomplete` — so contrast is silently unchecked on that page. This is the identical
silent-pass the README (lines 70-73) attributes to jsdom and claims the real-browser switch
fixes. It is NOT fixed for sign-in.

Proven by building two deliberately broken themes and scanning the real production preview
with `@axe-core/playwright` (same tags the suite uses):

| Mutation on sign-in                              | axe `color-contrast`           | Test result  |
| ------------------------------------------------ | ------------------------------ | ------------ |
| submit button `#cccccc` bg / white text (~1.6:1) | **0 violations, 1 incomplete** | PASS (blind) |
| body `colorText:#f0f0f0` (near-white on white)   | **0 violations, 1 incomplete** | PASS (blind) |

Computed style confirmed: `button[type=submit]` rendered `rgb(204,204,204)` bg + white text
— an egregious WCAG fail — and the suite stayed green.

**Contrast: the not-found test is NOT blind** (plain white bg, axe resolves it). Reverting
each committed fix produced a real violation there:

- `colorTextDescription` → antd default `#8c8c8c` (3.36:1): `viol_cc=1`.
- `colorPrimary` → antd default `#1677ff` (4.10:1, default-size button): `viol_cc=1`.

So both theme fixes ARE guarded — but only by `not-found`, never by `sign-in`.

**Impact:** Phase 06 rewrites the UI and will add components to auth screens. Anyone reading
"sign-in has no WCAG 2.1 AA violations" (or README line 70-73) will assume contrast is
guarded there. It is not. A contrast regression introduced on any auth screen ships green.

**Recommendation (pick one):**

1. Make the a11y helper assert `incomplete` for `color-contrast` is empty too (or fail the
   test when contrast comes back incomplete) — turns the blind spot into a loud one.
2. Give the sign-in card a real (ancestor) `background-color` instead of pseudo-element
   bands so axe can resolve it. Cheap and also more correct CSS.
3. At minimum, correct README lines 70-73 — the real-browser switch does not make contrast
   bite on pages whose background axe can't resolve.

---

### F2 — MEDIUM · CONFIRMED (state) · The "gate" gates nothing today; a11y/e2e never run on the current push flow

**Files:** `.github/workflows/ci.yml:98-101`, phase file Success criteria (documented)

Two compounding facts, both acknowledged in the phase file but worth stating plainly for
later phases that will "lean on" this net:

1. `develop` has no branch protection (phase file confirms `Branch not protected`). A red CI
   run still shows a live Merge button, and a direct push lands unchecked code before CI has
   an opinion. CI is a smoke alarm, not a lock. _(Deliberate user decision — not a defect.)_
2. `e2e` (and thus **all** a11y coverage) is `if: github.event_name == 'pull_request'`
   (`ci.yml:101`). The team currently pushes directly to `develop`. Result: **a11y and e2e
   have never executed in CI and will not until someone opens a PR** (phase file: "the e2e
   job has never run on a runner"). The `quality` job (lint/typecheck/test/build) is the only
   thing that runs on a push.

**Impact:** Until PRs become the norm, the "tested CI pipeline" the README advertises is, in
practice, lint + typecheck + unit + build on push. The a11y/e2e half is unverified on a real
runner. Fine as a conscious trade during the refactor; a landmine if a later phase assumes
e2e is protecting `develop`.

**Recommendation:** No code change required. When the refactor settles, enable branch
protection (the phase file already has the exact `gh api` command) so the PR-only jobs
actually gate. Track "first PR must confirm the e2e job's cache/install-deps/build path" as
an explicit checklist item — that path is entirely unexercised.

---

### F3 — LOW · CONFIRMED · Debounce _window duration_ is unasserted

**File:** `src/hooks/use-query-params.test.tsx:41-56`, `src/hooks/use-query-params.ts:14`

Mutating `DEBOUNCE_TIME` from `500` → `0` leaves all 3 hook tests green. The tests assert the
_collapsing_ behaviour and setter identity (both genuinely effective — un-memoizing the
setter and removing the unmount `cancel()` each correctly turn a test red), but nothing pins
the 500ms window. A future edit that accidentally zeroes or balloons the debounce ships
green. Minor — the observable URL behaviour is still covered.

**Recommendation:** Optional. Add one assertion that a write does NOT land after advancing
`DEBOUNCE_TIME - 1` ms, then does after the full window.

---

### F4 — LOW · CONFIRMED · e2e webServer flakes on rapid local reruns (`--strictPort`)

**File:** `playwright.config.ts:44-53`

`reuseExistingServer: !isCI` + `vite preview --strictPort` collide when two `playwright test`
runs happen back-to-back locally: the second dies with `webServer ... Exit code: 2` because
the previous preview hasn't released `4173`. Reproduced ~3× during this audit. CI is
unaffected (`isCI` → `reuseExistingServer:false`, fresh runner, `workers:1`). Local-only
iteration friction, not a correctness bug. No action needed; noting so it isn't mistaken for
a real e2e failure.

---

### F5 — INFORMATIONAL · `render.tsx` will churn hard in Phase 04

**File:** `src/testing/render.tsx:5-8,55-63`

The shared render helper wires `use-query-params` + `ReactRouter6Adapter` + `query-string` +
`MemoryRouter`. Audit report table B marks all of these for deletion in Phase 04 (typed
search params / TanStack Router). Correct for _today_ (mirrors the live app), but every unit
test flows through this file, so the Phase 04 provider swap is a single-file change here that
will touch the whole suite's behaviour at once. Flagging so it's planned, not discovered.

---

## What I VERIFIED GREEN (CONFIRMED unless noted)

**Unit tests are real, not tautologies** — mutation-tested each subject, every mutation went
red as it should:

| Subject                                                   | Mutation     | Result                              |
| --------------------------------------------------------- | ------------ | ----------------------------------- |
| `format.ts` NaN guard → `'Invalid Date'`                  | red (1 fail) | ✅ caught                           |
| `format.ts` locale `en-GB`→`en-US`                        | red (2 fail) | ✅ caught                           |
| `format.ts` explicit guard → `if(!value)` (epoch bug)     | red (1 fail) | ✅ caught                           |
| `use-query-params` un-memoize debounce (the original bug) | red          | ✅ caught                           |
| `use-query-params` remove unmount `cancel()`              | red          | ✅ caught                           |
| `axios.ts` drop `Authorization` header                    | red          | ✅ caught                           |
| `axios.ts` hardcode token (logout can't clear)            | red          | ✅ caught                           |
| en locale `Common.Login` value corrupted                  | red (2 fail) | ✅ sign-in i18n is non-tautological |

- **MSW `onUnhandledRequest:'error'` fires** — a throwaway test hitting an unmocked URL
  rejected with `[MSW] Error: intercepted a request without a matching request handler` +
  axios Network Error. The request did NOT escape to the network. Server lifecycle
  (`listen`/`resetHandlers`/`close` in `setup.ts:50-60`) is textbook and leak-free;
  `restoreMocks:true` set.
- **Coverage floor enforces** — raising `statements` 5→90 made `bun run test:cov` exit `1`
  with `ERROR: Coverage for statements (8.45%) does not meet global threshold (90%)`. Measured
  8.45/5.53/5.37/8.51 matches the phase claim exactly, and untested legacy files ARE counted
  (not excluded to flatter the number — exclusions are only test infra, mocks, generated
  locales, `.d.ts`).
- **e2e genuinely runs** — `bun run e2e` built the production bundle and passed 6/6 (smoke ×4,
  a11y ×2) in ~7s. `--list` shows all 6.
- **Lockfile** — `bun.lock` is committed; both CI jobs run `bun install --frozen-lockfile`
  (`ci.yml:37,112`). The report's open question 3 is resolved.
- **CI steps fail correctly** — no `continue-on-error` anywhere. Only softened step is the
  Codecov upload (`fail_ci_if_error:false` + skipped when token absent) — correct, it's
  informational by design (`codecov.yml` sets project+patch to `informational:true`).
- **Docs now match reality** — README:50 ("fails below the threshold"), README:62-63 (e2e/a11y
  "PRs" only), and the codecov-is-informational framing are all accurate to the workflow.
- **Todo list vs diff** — every `[x]` item is present and does what it claims (Vitest+RTL+MSW
  setup, empty-but-intentional handler registry, `render()` with fresh QueryClient, 4 smoke
  tests covering boot/i18n/auth-redirect/language-reload, ci.yml trigger split, coverage
  floor proven-to-fail, real-browser a11y, debounce regression test, Codecov). Unchecked items
  are the explicitly-deferred branch-protection and deploy-phase notes.

**SUSPECTED (reasoned, not mutated):** smoke's "no console errors" assertion is effective by
construction (collects `console.error`+`pageerror`, asserts empty). CI job dependency graph
(`e2e needs changes`, `predicate-quantifier:'every'`) is sound. Didn't run `actionlint`.

---

## Corrections to the phase file's own narrative

- Phase file & README imply the real-browser a11y switch makes contrast checks bite. True for
  `not-found`, **false for `sign-in`** (F1). The switch is still justified (jsdom can't do
  contrast at all), but the win is page-dependent, not universal.
- Phase file: the two theme fixes (`colorPrimary`, `colorTextDescription`) ARE regression-
  guarded — but exclusively by the `not-found` scan, never `sign-in`. If `not-found` is ever
  simplified away, both fixes lose their only test.

## Unresolved questions

1. F1 remediation — assert-on-`incomplete`, fix the sign-in background CSS, or just correct
   the README? (Recommend option 1 or 2; option 3 is the floor.)
2. Is the plan comfortable that a11y/e2e remain un-run in CI until PR flow starts (F2)? If yes,
   nothing to do; if the intent was "gated from day one," branch protection + a first PR are
   the missing steps.
3. Not mine but observed unclean in the tree: `plans/.../phase-03-data-layer-supabase-msw.md`
   shows 12 uncommitted insertions (I never touched it). Confirm that is intended WIP.
