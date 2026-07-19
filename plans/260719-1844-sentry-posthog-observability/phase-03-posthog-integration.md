---
phase: 3
title: PostHog Integration
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
  - 2
---

# Phase 3: PostHog Integration

## Overview

Wire `posthog-js` for analytics + masked session replay, add the PII sanitizer, and build
the unified `initObservability()` entry that boots Sentry + PostHog and owns user sync.
This phase finalizes the dynamic-import wiring in `main.tsx`.

## Requirements

- Functional: pageviews + autocapture events flow; replay records with all text/inputs masked.
- Non-functional: `person_profiles: 'identified_only'`; no email/ticket content in properties; loaded only when guard passes.

## Architecture

- `posthog.ts` owns init + sanitize + identify/reset.
- `index.ts` = `initObservability()`: reads `env`, calls `initSentry`/`initPostHog` for whichever
  key is present, then subscribes to `useAuthStore` to sync `{ id }` to both and reset on sign-out.
- `main.tsx` dynamically imports `index.ts` behind the env guard (mirrors the MSW pattern),
  so neither SDK enters the main chunk or runs under msw/tests.

## Related Code Files

- Create: `src/config/observability/posthog.ts` — `initPostHog(key, host)`, `sanitizeEvent`, `identifyUser(id)`, `resetUser()` (~70 LOC).
- Create: `src/config/observability/index.ts` — `initObservability()` + store subscription (~50 LOC).
- Modify: `src/main.tsx` — dynamic `initObservability()` behind guard, render still unconditional.

## Implementation Steps

1. `posthog.ts` — `initPostHog(key, host)`. **RED-TEAM: masking must cover autocapture, not
   just replay; pageview must track SPA nav; path/network URLs carry record ids.**
   ```ts
   posthog.init(key, {
     api_host: host,
     person_profiles: 'identified_only',
     capture_pageview: 'history_change', // 'true' = initial load ONLY; SPA nav needs this string
     autocapture: true,
     // top-level masks apply to autocapture events ($el_text, attributes) — separate pipeline from replay:
     mask_all_text: true,
     mask_all_element_attributes: true,
     capture_performance: false, // don't ship PostgREST perf-entry URLs (query filters)
     session_recording: {
       maskAllInputs: true,
       maskAllText: true, // documented absolute text mask (not maskTextSelector:'*')
       recordCrossOriginIframes: false,
     },
     before_send: sanitizeEvent,
   });
   ```
   - `sanitizeEvent(event)` — **allowlist, not denylist** (RED-TEAM Critical): free-text ticket
     content never matches an email regex. Normalize `$current_url`/`$pathname` to `:id`
     placeholders with NO query string (ticket id is in the PATH: `src/routes/_app/tickets/$ticketId.tsx`);
     strip `$el_text` and `$elements[].text`; keep only an explicit allowlist of event props,
     drop the rest. Return event or `null`. Pure + unit-testable.
   - `identifyUser(id)`: `posthog.identify(id)` — id only, no `$email`, no `$set` PII.
   - `resetUser()`: `posthog.reset()`.
2. `index.ts` — **RED-TEAM: scope the imports usably, isolate SDK failures, dedupe user sync.**
   ```ts
   export async function initObservability() {
     let setSentryUser: ((id: string | null) => void) | undefined;
     let identifyUser: ((id: string) => void) | undefined;
     let resetUser: (() => void) | undefined;

     if (env.VITE_SENTRY_DSN) {
       try {
         const m = await import('./sentry');
         m.initSentry(env.VITE_SENTRY_DSN);
         setSentryUser = m.setSentryUser;
       } catch (e) {
         console.error('[observability] Sentry init failed', e);
       }
     }
     if (env.VITE_POSTHOG_KEY) {
       try {
         const m = await import('./posthog');
         m.initPostHog(env.VITE_POSTHOG_KEY, env.VITE_POSTHOG_HOST);
         identifyUser = m.identifyUser;
         resetUser = m.resetUser;
       } catch (e) {
         console.error('[observability] PostHog init failed', e);
       }
     }

     let lastId: string | undefined;
     const sync = (user: { id: string } | null) => {
       if (user?.id === lastId) return; // fire only on real id transitions (token refresh re-fires the store)
       lastId = user?.id;
       setSentryUser?.(user?.id ?? null);
       if (user) identifyUser?.(user.id);
       else resetUser?.();
     };
     sync(useAuthStore.getState().user); // usually null at boot (status 'loading'); the subscribe below catches the first real session
     useAuthStore.subscribe((s) => sync(s.user));
   }
   ```
   - Per-SDK try/catch (RED-TEAM High): a PostHog chunk 404 after redeploy must NOT prevent
     Sentry init / reporter registration, and vice versa.
   - Import the three user-sync fns at function scope (RED-TEAM High: the old sketch destructured
     `setSentryUser` inside the `if` and never imported `identifyUser`/`resetUser`).
   - Dedupe on `user.id` (RED-TEAM Medium: Zustand fires the listener on every `set()` incl. the
     ~hourly silent token refresh — `src/stores/auth.ts` `applySession`).
3. `main.tsx` — **RED-TEAM Critical: there is no "async bootstrap" today; render lives in a
   `.finally()` on the single `enableMocking()` promise, and `enableMocking` returns early in
   supabase mode. Amend the actual chain (`main.tsx:42-52`), keep render unconditional, and give
   obs-init its OWN catch (the existing catch logs an `[msw]`-specific message).**
   ```ts
   const observabilityEnabled =
     env.VITE_API_MODE === 'supabase' && Boolean(env.VITE_SENTRY_DSN || env.VITE_POSTHOG_KEY);

   enableMocking()
     .catch((e) =>
       console.error('[msw] mock API failed to start; continuing against the real API', e)
     )
     .then(() =>
       observabilityEnabled
         ? import('~/config/observability')
             .then((m) => m.initObservability())
             .catch((e) => console.error('[observability] init failed; app continues', e))
         : undefined
     )
     .finally(() => {
       /* existing createRoot(...).render(<StrictMode><App/></StrictMode>) */
     });
   ```

## Success Criteria

- [ ] Prod-mode smoke (keys set + `supabase`): `initObservability` actually runs (RED-TEAM
      Critical — verify it is NOT inside `enableMocking`'s early-return branch).
- [ ] Replay masks all text/inputs AND autocapture `$el_text`/attributes are masked (open a
      ticket list, click a subject link, confirm the captured event carries no subject text).
- [ ] `capture_pageview: 'history_change'` → an in-app route change emits a `$pageview`.
- [ ] With keys unset OR `VITE_API_MODE=msw`: no PostHog/Sentry network calls, no SDK chunk loaded.
- [ ] `identify` sends `id` only — no `$email`; fires once per real id transition (not on token refresh).
- [ ] `sanitizeEvent` unit test: `$el_text` stripped, ticket path normalized to `:id`, query dropped.
- [ ] Only one key set, or one SDK chunk fails to import → the other SDK still initializes.

## Risk Assessment

- Risk: replay/autocapture leaks ticket text if masking misconfigured. Mitigation: mask at BOTH
  layers (`mask_all_text` top-level + `maskAllText`/`maskAllInputs` in `session_recording`),
  `capture_performance:false`, plus the automated leak guard in phase 4.
- Risk: static import of `index.ts` anywhere pulls SDKs into main bundle. Mitigation: only
  `main.tsx` imports it, dynamically; enforce via phase-4 bundle check.
- Risk: one SDK's chunk 404 aborts init and silences the other. Mitigation: per-SDK try/catch.
