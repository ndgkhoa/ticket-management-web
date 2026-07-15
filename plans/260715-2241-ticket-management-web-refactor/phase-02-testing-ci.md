# Phase 02 — Testing & CI Infrastructure

**Priority:** P0 · **Status:** ⬜ todo · **Depends:** Phase 01

## Overview
Stand up the full testing pyramid + MSW + GitHub Actions before feature work, so all subsequent code is born tested and every PR is gated. This is the #1 missing thing for a "senior" signal.

## Requirements
- **Vitest** + **Testing Library** + jsdom + `@testing-library/user-event` + **jest-axe**.
- **MSW** browser worker (`src/mocks/browser.ts`) + node server (`src/mocks/server.ts`) + handler registry — doubles as the mock API (Phase 03 fills handlers).
- **Playwright** e2e scaffold (config, fixtures, one smoke test).
- **GitHub Actions** pipeline: install → lint → typecheck → unit test + coverage → build → Playwright e2e. Later phases add Lighthouse CI + Chromatic.
- Coverage reporting (v8) + threshold + README badge.

### CI free-tier guardrails — decide here, not after the bill
Everything in this project runs on free tiers (Phase 09 has the full table). Two of them are consumed by *CI frequency*, so the rules belong in `ci.yml` from day one — retrofitting them after burning the quota is the expensive order.

- **Chromatic: 5,000 snapshots/month free, and snapshots are `stories × viewports × pushes`.** Phase 05 mandates a story per primitive plus 7 DataTable states — roughly 60 stories × 2 viewports = ~120 snapshots *per push*. That exhausts the month in ~40 pushes, i.e. 2–3 weeks of real work, and then visual regression silently stops gating.
  - **Run Chromatic on `pull_request` only — never on every push to a branch.**
  - **Enable TurboSnap** (only re-snapshots stories the diff touches; effectively ~25k snapshots).
  - If a run is skipped or quota is hit, that must be visible in CI — a green check that skipped visual regression is worse than a red one.
- **Cloudflare Pages: 500 deploys/month.** Preview-per-PR is fine; preview-per-push is not. Scope deploy triggers to PRs.
- **Playwright/e2e is the slowest job** — it doesn't cost money on public repos, but it costs *your* iteration time. Cache browsers; don't run e2e on doc-only changes (`paths-ignore`).
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
- [ ] Vitest + RTL + jest-axe + setup
- [ ] MSW browser + node + handler registry
- [ ] render() test utility with providers
- [ ] Playwright scaffold + smoke e2e
- [ ] GitHub Actions ci.yml (lint/typecheck/test/build/e2e) + push-vs-PR trigger split
- [ ] Coverage threshold + badge

## Success criteria
`bun run test` + `bun run e2e` pass locally; CI green on PR; a failing test blocks merge. Quota-consuming jobs (Chromatic, preview deploy, Lighthouse) run on PRs only.

## Risks
- MSW + Vite worker path config; ensure worker served from `public/`.
- Playwright in CI needs browser install step + caching.
- **Free-tier quotas are consumed by CI frequency, and running out fails quietly** — Chromatic stops gating, previews stop deploying, and CI still shows green. The trigger split is the mitigation; a skipped quality gate must never read as a pass.
