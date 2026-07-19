---
title: Sentry + PostHog observability with PII scrubbing
description: >-
  Add error monitoring (Sentry) + product analytics/session replay (PostHog) to
  the React 19 + Vite + Supabase SPA, disabled-by-default, PII-safe, and kept
  out of the msw/test bundle.
status: completed
priority: P2
created: 2026-07-19T00:00:00.000Z
---

# Sentry + PostHog observability with PII scrubbing

## Overview

Portfolio help-desk SPA deploys live on Supabase but has zero production visibility.
Add two optional, key-gated integrations: **Sentry** (`@sentry/react`) for errors, and
**PostHog** (`posthog-js`) for analytics + masked session replay. Both are **no-ops when
their keys are unset**, never load in `VITE_API_MODE=msw`/tests, and never send PII
(email, ticket content). Users are identified by Supabase `user.id` only.

## Design decisions (confirmed)

- **PostHog region:** US → `VITE_POSTHOG_HOST` defaults to `https://us.i.posthog.com`.
- **Session replay:** ON, masked at BOTH layers — `session_recording: { maskAllInputs: true,
maskAllText: true }` for the replay DOM, plus top-level `mask_all_text: true` /
  `mask_all_element_attributes: true` so **autocapture events** (`$el_text`, attributes) are
  masked too. Masking replay alone is NOT enough (autocapture is a separate pipeline).
- **PII strategy = allowlist, not denylist:** free-text ticket content (subject, description,
  notes, customer names) never matches an email regex, so denylist scrubbing is unsound. Send
  only an explicit allowlist of safe properties/tags; drop everything else by default. Covers
  Sentry `beforeSend` **and** `beforeBreadcrumb` (fetch/XHR URLs to PostgREST carry query
  filters), and PostHog `before_send`.
- **Sentry source maps:** optional — the Vite plugin runs only when `SENTRY_AUTH_TOKEN` is
  present at build time; absent → skipped, build unaffected, no orphan public source maps.
- **Deploy wiring is in scope:** `VITE_*` keys are inlined at build time, so
  `.github/workflows/deploy.yml` must forward them (+ the build-time Sentry secrets) or the
  prod bundle bakes `undefined` and the whole feature is inert.

## Architecture (key mechanism)

Heavy SDKs must not enter the main chunk or the msw/test path. Achieved by:

1. **Dynamic import + env guard** in `main.tsx`: `initObservability()` is imported and run
   only when `VITE_API_MODE==='supabase'` AND (`VITE_SENTRY_DSN` or `VITE_POSTHOG_KEY`) set.
2. **Light reporter bridge** `src/config/observability/reporter.ts` (zero SDK imports):
   `reportError()` is a no-op until `initObservability()` registers a handler. `app.tsx`
   and `router.tsx` import only this light module — so the error boundaries forward to
   Sentry without statically pulling the SDK into the main bundle.
3. **User sync lives inside the dynamic module**: `initObservability()` subscribes to
   `useAuthStore` and pushes `{ id }` to Sentry + PostHog; resets on sign-out.

## Phases

| Phase | Name                                                     | Status    |
| ----- | -------------------------------------------------------- | --------- |
| 1     | [Config & Env](./phase-01-config-env.md)                 | Completed |
| 2     | [Sentry Integration](./phase-02-sentry-integration.md)   | Completed |
| 3     | [PostHog Integration](./phase-03-posthog-integration.md) | Completed |
| 4     | [Verify & Docs](./phase-04-verify-docs.md)               | Completed |

## Dependencies

None. Independent of the two open plans (refactor, helpdesk-domain-gaps) — no shared files.

## Implementation deviations (as-built)

- **Module home:** `src/lib/observability/` (not `src/config/observability/`). An eslint boundary
  rule forbids `config/` from importing stores/clients; observability is a configured client, so
  it belongs in `lib/` beside `supabase.ts`.
- **Replay text mask:** `session_recording.maskTextSelector: '*'` — the installed `posthog-js@1.404.1`
  has no `maskAllText` field on `SessionRecordingOptions` (compiler-verified). Autocapture is still
  masked via the top-level `mask_all_text: true`.
- **Post-review hardening applied:** `ui.*` breadcrumb selector message stripped; URL fragment
  stripped; `$elements_chain` dropped; account-switch resets before re-identify; error-message
  free-text constraint documented in code + README.

## Red Team Review

### Session — 2026-07-19

**Findings:** 14 (14 accepted, 0 rejected) — deduped from 19 raw across 3 hostile reviewers
(Security Adversary, Assumption Destroyer, Failure Mode Analyst).
**Severity breakdown:** 4 Critical, 6 High, 4 Medium

| #   | Finding                                                                                              | Severity | Disposition | Applied To |
| --- | ---------------------------------------------------------------------------------------------------- | -------- | ----------- | ---------- |
| 1   | deploy.yml never forwards observability keys → inert in prod, no source-map upload                   | Critical | Accept      | Completed  |
| 2   | main.tsx has no "async bootstrap"; obs-init lands in a dead branch / risks losing `.finally(render)` | Critical | Accept      | Completed  |
| 3   | Email-only denylist can't scrub free-text ticket PII → invert to allowlist                           | Critical | Accept      | Completed  |
| 4   | PostHog autocapture leaks `$el_text` (ticket subjects/names); masking covered replay only            | Critical | Accept      | Completed  |
| 5   | Sentry fetch/XHR breadcrumbs leak PostgREST query filters (search term, UUIDs)                       | High     | Accept      | Phase 2    |
| 6   | Ticket id is in the URL path + replay network capture; sanitizer stripped query only                 | High     | Accept      | Phase 3    |
| 7   | `capture_pageview: true` doesn't track SPA nav → use `'history_change'`                              | High     | Accept      | Phase 3    |
| 8   | `index.ts` sketch scoping bug — user-sync fns never imported at usable scope                         | High     | Accept      | Phase 3    |
| 9   | `initObservability()` lacks per-SDK try/catch; one chunk 404 silences error capture                  | High     | Accept      | Phase 3    |
| 10  | Replay masking guarded manually only; `maskTextSelector:'*'` misses attributes                       | High     | Accept      | Phase 3, 4 |
| 11  | Obs-init failure mislabeled as `[msw]` error by the reused catch                                     | Medium   | Accept      | Phase 3    |
| 12  | Auth sync fires on every store mutation; boot sync always null → dedupe on id                        | Medium   | Accept      | Phase 3    |
| 13  | Router `defaultErrorComponent` is inline arrow; needs named component + StrictMode dedup             | Medium   | Accept      | Phase 2    |
| 14  | Boot-window errors (module load, env.ts throw) uncaptured → document caveat                          | Medium   | Accept      | Phase 2, 4 |

### Whole-Plan Consistency Sweep

Re-read `plan.md` + all four phase files after applying findings. Verified no stale primary
usage survives: `maskTextSelector:'*'` replaced by `maskAllText` (only referenced in the fixed
"not maskTextSelector" note + findings log), `capture_pageview:true` → `'history_change'`,
denylist scrubbing → allowlist everywhere, the "async bootstrap" claim corrected to amend the
real `main.tsx` `.finally(render)` chain, and deploy.yml wiring added to phase 1. Zero unresolved
contradictions — plan is implementation-ready.
