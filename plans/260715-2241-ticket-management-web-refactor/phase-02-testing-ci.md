# Phase 02 — Testing & CI Infrastructure

**Priority:** P0 · **Status:** ✅ done (2026-07-16) · **Depends:** Phase 01

## Outcome — what actually landed

Verified green locally: `bun run lint` (0 errors), `bunx tsc -b`, `bun run lang:check`,
`bun run test:cov` (17 tests), `bun run build`, `bun run e2e` (6 tests, 5 consecutive
clean runs). The unit suite is verified green under UTC, UTC+7, UTC-4 and UTC+14.

**Bugs this phase found — all of them invisible to typecheck and lint:**

- **antd's default primary button fails WCAG AA.** White on `#1677ff` measures 4.10:1
  against the 4.5:1 needed for normal text, and `.ant-result-subtitle` (`#8c8c8c` on
  white) is 3.36:1. Both were live on every screen. Sign-in only escaped because its
  button is `size="large"`, where the 3:1 large-text threshold applies. Fixed by
  overriding two tokens with antd's own palette one step darker (blue-7 `#0958d9` =
  6.16:1, gray-8 `#595959` = 7.00:1), so the design language is unchanged.
  `styles/theme.ts` had been an entirely commented-out file until now.
- **`tsconfig.node.json` only included `vite.config.ts`.** `tsc -b` was reporting
  success while never reading `playwright.config.ts`, `vitest.config.ts`, `e2e/**` or
  `scripts/**`. Proved by injecting a type error into each and watching tsc stay green.
  Widening the include immediately surfaced two real errors that had been hiding in
  `scripts/`: `js-yaml` had no types (`@types/js-yaml` was never installed) and
  `check-locale-sync.ts` passed a `string` where `LDMLPluralRule` was required.
- **`engines.node` allowed Node 20, which reached EOL in April 2026.** The range had
  been copied from Vite's requirement without checking it. Now `>=22.12.0`; Node 24 is
  the Active LTS and what development runs on.
- **`vite.config.ts` overrode the dev port to 3000** for no reason — Vite's default
  (5173) is what a reader expects. Override removed.
- **README was still the Vite boilerplate**: titled "Vite React Boilerplate", a
  Contentful stock screenshot, commands that do not exist (`bun build`, `bun start`),
  and a feature list claiming light/dark mode and live previews — none of which exist.
  Rewritten.
- **The hardcoded-Vietnamese audit from Phase 01 undercounted: 18, not 8.** The
  original grep used an incomplete character class and missed `ở`, `ề`, `ả` and others,
  so `not-found.tsx`, `container.tsx`, `page-layout.tsx` and both fallbacks were never
  recorded. Re-scanned with the full `[À-ỹ]` range.

**Caught by the code review — every one of them verified before being accepted, and
every one of them real:**

- **The `ResizeObserver` stub was not constructable.** It was built with
  `vi.fn().mockImplementation(() => ({...}))`; an arrow function is not a constructor, so
  `new ResizeObserver()` threw "is not a constructor" — the stub replaced one error with
  another while its comment claimed it fixed the problem. Nothing caught it because no
  test yet renders a size-observing component. Now a class.
- **`formatDate` tests failed outside a positive UTC offset.** 3 of 7 went red under
  `TZ=America/New_York` ('04/01/2024' vs '05/01/2024'). CI is UTC and development is
  UTC+7, so this would have stayed green here forever and broken on a contributor's
  first clone. The formatter is correct — it renders an instant in the viewer's zone,
  which is right for a help desk — so the fix is `env: { TZ: 'UTC' }` in the Vitest
  config, giving the assertions a fixed zone. Verified across UTC, UTC+7, UTC-4 and
  UTC+14.
- **A rejected `worker.start()` left a blank page.** `main.tsx` rendered inside
  `enableMocking().then(...)`, so a failed worker (404, insecure origin, service workers
  disabled) skipped render entirely with only an unhandled rejection to show for it —
  a regression, since render used to be unconditional. Now `.catch().finally()`: the
  mock API is best-effort, rendering is not.
- **The coverage floor fired on growth, not on regressions.** Set at the measured
  8/5/5/8 with 8.45 actual, it had 0.45 points of headroom — coverage is a ratio, so
  _adding untested code lowers it even when nothing regressed_. Measured: one new
  60-function file with no tests dropped statements to 7.08% and turned CI red. Since
  every later phase adds new code, that floor was a permanently red gate in waiting.
  Lowered to 5/4/4/5, with the comment now saying what it actually does.
- **`sign-in.test.tsx` asserted against `i18n.t()` — a tautology.** If i18n breaks,
  `t()` returns the raw key, the component renders that same key, and the test passes:
  exactly the failure it was meant to catch. Now asserts literal copy; verified by
  removing `Common.Login` from the bundle, which turns 3 of 4 tests red (the old version
  stayed green).
- **The auth store singleton was cleaned up inside a test body**, so a failure before
  that line leaked the session into later tests. Moved to `afterEach`.
- **`i18n.changeLanguage` had no `finally`** — a mid-test failure left every later test
  in Vietnamese.
- **The a11y "flake" was not a flake.** The not-found scan raced React's first paint, so
  axe sometimes scanned an empty DOM and reported a _false pass_. Adding the wait made
  it fail 10/10 — because the page genuinely violates AA. It now waits on "404", which
  survives the page being localised.
- **Comments and README overstated MSW.** With an empty registry and `bypass`, the
  worker answered nothing while the config claimed it "answers from the handler
  registry". Reworded; `bypass` → `warn` so a missing handler says so.
- **`playwright.config.ts` lacked `--strictPort`** — with a busy 4173 Vite silently
  picks another port and the suite tests whatever already owns it.
- **`codecov.yml` added.** Codecov's default `patch` status would have failed nearly
  every PR at 8% coverage, leaving two gates disagreeing. Codecov is now informational;
  the Vitest floor is the gate.

**Decisions taken during implementation:**

- **jest-axe dropped for `@axe-core/playwright`** _(user-approved)_. Evidence, not
  preference: axe in jsdom returns `color-contrast` as **incomplete**, and
  `toHaveNoViolations` reads only `violations` — so a white-on-white button passes. The
  first real a11y bug found here was a contrast bug, i.e. exactly the rule jsdom cannot
  run. `@axe-core/playwright` also has ~3× the downloads and was published 8 days ago
  against jest-axe's 16-month silence. Component-level a11y arrives with the Storybook
  a11y addon, which is also a real browser.
- **Coverage threshold is a floor with headroom** _(user-approved)_: 5/4/4/5 against ~8.45
  measured. The first attempt set it at the measured value, which the review showed
  fires on growth rather than on regressions — see above. Verified the gate still bites
  by deleting a test file. The number is low and honest about why: coverage counts all
  of `src/`, most of which is antd screens due for replacement, and testing them now
  would mean writing tests to delete.
- **e2e runs against the production build, not the dev server.** Rolldown breakage can
  be production-only, which is exactly what a dev-server e2e would miss.
- **`paths-filter` runs as its own job rather than `paths-ignore` on the trigger.**
  `paths-ignore` skips the whole workflow, and a required check that never runs leaves a
  PR unmergeable forever. `predicate-quantifier: 'every'` is load-bearing: the default
  ORs the negations, so a docs-only PR would still have triggered e2e. Verified the
  picomatch semantics against the real library before trusting them.
- **CI pins no Node version** — every script runs through Bun. Worth revisiting at
  deploy time: Cloudflare Pages builds with Node, so the deploy runtime differs from
  the CI runtime.

**Open — needs the user, cannot be done from here:** Codecov requires an account and a
`CODECOV_TOKEN` repo secret. The upload step is skipped (not failed) while the secret is
absent, so a fork PR does not go red over a token it cannot have. The README badge stays
grey until the token exists.

## Overview

Stand up the full testing pyramid + MSW + GitHub Actions before feature work, so all subsequent code is born tested and every PR is gated. This is the #1 missing thing for a "senior" signal.

## Requirements

- **Vitest** + **Testing Library** + jsdom + `@testing-library/user-event` + **jest-axe**.
- **MSW** browser worker (`src/mocks/browser.ts`) + node server (`src/mocks/server.ts`) + handler registry — doubles as the mock API (Phase 03 fills handlers).
- **Playwright** e2e scaffold (config, fixtures, one smoke test).
- **GitHub Actions** pipeline: install → lint → typecheck → unit test + coverage → build → Playwright e2e. Later phases add Lighthouse CI + Chromatic.
- Coverage reporting (v8) + threshold + README badge.

### CI free-tier guardrails — decide here, not after the bill

Everything in this project runs on free tiers (Phase 09 has the full table). Two of them are consumed by _CI frequency_, so the rules belong in `ci.yml` from day one — retrofitting them after burning the quota is the expensive order.

- **Chromatic: 5,000 snapshots/month free, and snapshots are `stories × viewports × pushes`.** Phase 05 mandates a story per primitive plus 7 DataTable states — roughly 60 stories × 2 viewports = ~120 snapshots _per push_. That exhausts the month in ~40 pushes, i.e. 2–3 weeks of real work, and then visual regression silently stops gating.
  - **Run Chromatic on `pull_request` only — never on every push to a branch.**
  - **Enable TurboSnap** (only re-snapshots stories the diff touches; effectively ~25k snapshots).
  - If a run is skipped or quota is hit, that must be visible in CI — a green check that skipped visual regression is worse than a red one.
- **Cloudflare Pages: 500 deploys/month.** Preview-per-PR is fine; preview-per-push is not. Scope deploy triggers to PRs.
- **Playwright/e2e is the slowest job** — it doesn't cost money on public repos, but it costs _your_ iteration time. Cache browsers; don't run e2e on doc-only changes (`paths-ignore`).
- **Never run AI edge functions in CI.** Tests hit MSW-mocked AI responses (Phase 07). Claude has no free tier, and a test suite that calls a real LLM on every push spends real money to assert a mock-shaped answer.

## Related code files

- Create: `vitest.config.ts`, `src/testing/setup.ts` (RTL + jest-axe + MSW server lifecycle) + `src/testing/render.tsx` (render wrapped in the app's providers — every test needs it; don't re-wire providers per test file), `src/mocks/{browser,server,handlers}.ts`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `.github/workflows/ci.yml`.
- Modify: `package.json` scripts (`test`, `test:watch`, `test:cov`, `e2e`), `.gitignore`.

## Implementation steps

1. Install/configure Vitest + RTL + jsdom + jest-axe; global setup file wiring MSW `server` (listen/reset/close).
2. Create MSW browser worker + node server + empty typed handler array; wire worker start in dev when `VITE_API_MODE=msw`.
3. Add a `render` test util (wraps providers: Query, Router, theme).
4. Scaffold Playwright; one smoke test (app boots, renders shell).
5. Write `ci.yml` with matrix-free jobs: lint, typecheck, test+coverage, build, e2e (upload artifacts on fail). Set the trigger split now: **push → lint/typecheck/test/build; pull_request → + e2e, Chromatic (Phase 05), Lighthouse (Phase 09), preview deploy.** The quota-consuming jobs are PR-only.
6. Add coverage threshold + badge; document `test` scripts.

## Todo

- [x] Vitest + RTL + setup (jsdom stubs for antd's matchMedia/ResizeObserver; MSW
      lifecycle with `onUnhandledRequest: 'error'` so an unmocked request fails loudly
      instead of escaping to the network)
- [x] MSW browser worker + node server + handler registry (registry intentionally
      empty — handlers describe a data contract that does not exist yet)
- [x] `render()` test utility with providers (fresh QueryClient per render, never the
      app singleton, so cache cannot leak between tests)
- [x] Playwright scaffold + smoke e2e (boot, no console errors, i18n keys not leaking,
      auth redirect, language survives reload)
- [x] GitHub Actions ci.yml + push-vs-PR trigger split; validated with `actionlint`
- [x] Coverage threshold, measured and proven to fail on a drop
- [x] **a11y in a real browser** (`@axe-core/playwright`, WCAG 2.1 AA) — replaced
      jest-axe; found the antd contrast bugs jsdom cannot see
- [x] **Extra:** regression test locking the memoized debounce fix — verified it fails
      on the pre-fix code (2 of 3 tests) and passes after. The first version of this
      test passed against the buggy code and was rewritten: the bug does not corrupt
      the final value, it lets two writes through, and both orderings end on the last
      keystroke. Setter identity is the observable difference.
- [ ] **Open → user:** Codecov account + `CODECOV_TOKEN` secret (badge stays grey until
      then; CI skips the upload rather than failing). `codecov.yml` is already in place
      so the default statuses cannot start failing PRs the moment the token lands.
- [ ] **Open → user:** branch protection on `develop`. "A failing test blocks merge" is a
      GitHub setting, not something any file in this repo can assert — until it is set,
      CI is advisory. Required contexts must match the workflow's `name:` values:
      `lint · typecheck · test · build` and `e2e (Playwright)`. Marking e2e required is
      safe: a docs-only PR skips that job, and a skipped job satisfies a required check
      (this is why the `changes` job exists instead of `paths-ignore`, which would leave
      the check pending forever).
- [ ] **Open → deploy phase:** CI runs on Bun, Cloudflare Pages builds on Node — same
      code, two runtimes.
- [ ] **Open → deploy phase:** `public/_redirects` (`/*  /index.html  200`) is needed for
      deep links, but it makes same-origin API requests return HTML 200 instead of 404.
      With an empty MSW registry that surfaces as a JSON parse error rather than a
      network error — the demo is only meaningful once handlers exist.

## Success criteria

`bun run test` + `bun run e2e` pass locally; CI green on PR; a failing test blocks merge. Quota-consuming jobs (Chromatic, preview deploy, Lighthouse) run on PRs only.

## Risks

- MSW + Vite worker path config; ensure worker served from `public/`.
- Playwright in CI needs browser install step + caching.
- **Free-tier quotas are consumed by CI frequency, and running out fails quietly** — Chromatic stops gating, previews stop deploying, and CI still shows green. The trigger split is the mitigation; a skipped quality gate must never read as a pass.
