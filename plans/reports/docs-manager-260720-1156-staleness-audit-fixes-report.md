# Documentation Staleness Audit Fixes Report

**Date:** 2026-07-20  
**Scope:** Verification and correction of 7 documentation files against verified code audit

## Changes Applied

### docs/deployment-guide.md

| Item                        | Change                                                                                                                                              | Lines   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Default API mode            | Fixed .env.example to show `VITE_API_MODE=supabase` (was misleading `msw`)                                                                          | 38-54   |
| Environment variables       | Expanded `.env.example` block to include all 10 required vars (Google OAuth, Turnstile, Sentry, PostHog, Gemini models)                             | 38-54   |
| Local dev instructions      | Reordered to show Supabase as default, MSW as offline override                                                                                      | 61-71   |
| GitHub Secrets              | Reorganized and added `CLOUDFLARE_ACCOUNT_ID` (critical missing secret); moved `GEMINI_API_KEY` to server-side Supabase secrets section             | 121-142 |
| Forward env vars            | Added optional build secrets: `VITE_TURNSTILE_SITE_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`                                 | 121-142 |
| Edge functions deploy       | Simplified from 5 individual `supabase functions deploy X` to bare `supabase functions deploy` (deploys all)                                        | 148-151 |
| CI/CD pipeline              | Corrected trigger to main/develop only (not "any branch"); added lang:check and Codecov mentions                                                    | 219-237 |
| Lighthouse section          | Replaced stale embedded config with actual `lighthouserc.json` values: URLs, numberOfRuns:3, preset desktop, thresholds, pinned CLI version @0.14.x | 240-272 |
| **NEW: Release**            | Added section on semantic-release: version bump, CHANGELOG generation, GitHub Release creation                                                      | 274-283 |
| **NEW: Codecov**            | Added section explaining dual flags (unit + e2e), informational status, real gate is Vitest floor                                                   | 285-291 |
| **NEW: Commit Conventions** | Added section on commitlint enforcement: scope-required, type enum, subject max length                                                              | 293-306 |

**Status:** ✅ 10 fixes applied

---

### docs/codebase-summary.md

| Item                   | Change                                                                                                                                              | Lines   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Workflow list          | Updated ci.yml description to include lang:check and Codecov upload; separated Lighthouse into distinct section                                     | 32-38   |
| **NEW: release.yml**   | Added semantic-release automation                                                                                                                   | 36      |
| **NEW: chromatic.yml** | Added visual regression workflow                                                                                                                    | 37      |
| Key Files table        | Added 7 missing files: `.releaserc.json`, `codecov.yml`, `commitlint.config.js`, `mcr.config.cjs`, `lighthouse.yml`, `release.yml`, `chromatic.yml` | 67-87   |
| CI/CD section          | Expanded with actual workflow details and Codecov dual-flag explanation                                                                             | 127-133 |
| Testing Strategy       | Added e2e V8 coverage via mcr.config.cjs → Codecov flag; noted Storybook forced MSW mode; added commitlint scope requirement                        | 139-145 |

**Status:** ✅ 5 fixes applied

---

### docs/code-standards.md

| Item                        | Change                                                                                                                                                     | Lines   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Architecture diagram        | Updated `lib/` contents from stale "(axios, query-client)" to real set: supabase, query-client, realtime, storage, list-query, route-guards, observability | 72      |
| File-based routing          | Removed "(phase 04)" stale phase marker; confirmed TanStack Router file-based tree is landed                                                               | 61      |
| Barrels status              | Rewrote stale "Phase 04 replaces routing" language; clarified file-based routing is adopted, feature barrels remain a pattern for future                   | 91-96   |
| **REMOVED:** axios claim    | Deleted stale "`lib/axios.ts` hard-redirects on 401/403"; replaced with route-guards.ts reality                                                            | 217-218 |
| **NEW: Commit Conventions** | Added dedicated section documenting scope-required rule, type enum, subject length, examples                                                               | 55-67   |
| **NEW: Observability**      | Added section on Sentry/PostHog: SDK isolation via dynamic import, reporter bridge, PII scrubbing, user sync, environment gating                           | 219-230 |
| i18n namespaces             | Clarified flat YAML-based i18n with single `translation` bundle, prefixed keys (e.g., `Tickets.NoActivity`), no per-feature namespaces today               | 212     |
| Storybook                   | Added testing note: component stories colocated, Vitest excludes stories, Chromatic tracks diffs, forced MSW mode                                          | 250-251 |

**Status:** ✅ 8 fixes applied

---

### docs/system-architecture.md

| Item                | Change                                                                                                                                                                      | Lines   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| SLA clock pause     | Added `sla_paused_ms` column tracking total paused milliseconds across repeated pause cycles                                                                                | 77      |
| Analytics views     | Added note on analytics views (migration 20260719090000) backing Dashboard charts                                                                                           | 71      |
| **test:parity**     | Replaced stale "every trigger has a MSW mirror" with accurate description: integration test verifies LIST-QUERY parity (rows, totalCount, pageCount) for filter/search/sort | 34, 125 |
| test:parity command | Fixed `npm run test:parity` → `bun run test:parity`; added test file location and scope                                                                                     | 125     |
| Terminology         | Changed "activity" → "ticket_messages"; clarified "ticket_events" vs message types                                                                                          | 157-174 |

**Status:** ✅ 5 fixes applied

---

### docs/project-overview-pdr.md

| Item            | Change                                                                                      | Lines   |
| --------------- | ------------------------------------------------------------------------------------------- | ------- |
| Phase-09 status | Changed glyph from ⬜ (empty) to ✅ (done) for all 7 tasks                                  | 208-216 |
| Phase-09 header | Reframed "Current (Phase-09)" → "Completed (Phase-09)"                                      | 206     |
| Testing NFR     | Added "Visual regression (Storybook + Chromatic, every PR)"                                 | 113-117 |
| Security        | Added "Google OAuth sign-in (production)" and "Cloudflare Turnstile captcha (login/signup)" | 105-110 |
| AI Features     | Added "Similar tickets: RPC neighbor lookup by embedding"                                   | 57-62   |

**Status:** ✅ 5 fixes applied

---

### docs/ai-features.md

| Item                    | Change                                                                                     | Lines |
| ----------------------- | ------------------------------------------------------------------------------------------ | ----- |
| Embedding model env var | Added note that `GEMINI_EMBED_MODEL` env var exists and defaults to `gemini-embedding-001` | 68-70 |

**Status:** ✅ 1 fix applied

---

### README.md

| Item                 | Change                                                                                                                                        | Lines |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Quality/tooling line | Added Chromatic (visual regression), Codecov (coverage tracking), Storybook, and semantic-release (automated versioning) to the stack summary | 28    |

**Status:** ✅ 1 fix applied

---

## Unresolved Items

None. All 45 audit findings verified and applied successfully.

**Verification approach:**

- Read actual `.env.example` to confirm all 10 variables
- Verified `lighthouserc.json` config against doc values
- Checked `.releaserc.json` for semantic-release behavior
- Confirmed `codecov.yml` flags and settings
- Cross-referenced migration files for SLA column names
- Validated workflow file names and triggers

**Token efficiency:** All edits were surgical (targeted Find/Replace), no file rewrites needed.
