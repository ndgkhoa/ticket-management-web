---
phase: 2
title: Sentry Integration
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
---

# Phase 2: Sentry Integration

## Overview

Wire `@sentry/react` for error monitoring: init in a dynamically-imported module, forward
React error-boundary errors via a light reporter bridge, set user context to `id` only,
and add an optional source-map upload plugin gated by `SENTRY_AUTH_TOKEN`.

## Requirements

- Functional: uncaught + boundary-caught errors (post-init) reach Sentry; releases readable via source maps when token set.
- Non-functional: `sendDefaultPii: false`; **allowlist** scrubbing on both `beforeSend` and
  `beforeBreadcrumb` so no free-text ticket content, PostgREST query filters, or record UUIDs
  leave the client; SDK absent from main + msw bundles.

## Known limitation (accepted)

Errors thrown **before** init completes are not captured: top-level module imports
(`~/config/env` can throw at load, `~/i18n`, `~/app/app`) and the dynamic-import window run
before `Sentry.init`. We keep observability in a dynamic chunk on purpose (bundle isolation),
so boot-window telemetry is out of scope. Success criteria and docs must say "post-init
errors", not "all uncaught errors". (RED-TEAM Medium — boot-window blind spot.)

## Architecture

- **Reporter bridge** (light, zero SDK imports) decouples the error boundaries from Sentry
  so `app.tsx`/`router.tsx` stay out of the SDK's import graph.
- **Dynamic init** registers the bridge handler + user sync; only loaded when guard passes.
- **Vite plugin** is push-conditional on `process.env.SENTRY_AUTH_TOKEN`; when present, also
  flip `build.sourcemap=true` and delete maps after upload (no public orphan maps).

## Related Code Files

- Create: `src/config/observability/reporter.ts` — `reportError()` no-op bridge (~15 LOC).
- Create: `src/config/observability/sentry.ts` — `initSentry(dsn)`, `scrubEvent`, `setSentryUser(id|null)` (~60 LOC).
- Modify: `src/app/app.tsx` — add `onError` to the shell `ErrorBoundary`.
- Modify: `src/app/router.tsx` — forward route/data errors from `defaultErrorComponent`.
- Modify: `vite.config.ts` — conditional `sentryVitePlugin` + `build.sourcemap`.
- (Index wiring `initObservability()` finalized in phase 3.)

## Implementation Steps

1. `reporter.ts`:
   ```ts
   type Handler = (error: unknown, context?: Record<string, unknown>) => void;
   let handler: Handler | null = null;
   export const setErrorReporter = (h: Handler | null) => {
     handler = h;
   };
   export const reportError: Handler = (error, context) => handler?.(error, context);
   ```
2. `sentry.ts`:
   - `initSentry(dsn: string)`: `Sentry.init({ dsn, environment: import.meta.env.MODE,
sendDefaultPii: false, tracesSampleRate: 0, beforeSend: scrubEvent,
beforeBreadcrumb: scrubBreadcrumb })`. Tracing off (YAGNI — pure error monitoring).
   - `scrubEvent(event)` — **allowlist, not denylist** (RED-TEAM Critical: free-text ticket
     PII never matches an email regex). Keep only known-safe fields; blank out or drop the
     rest: normalize `event.request.url` to path-with-`:id` placeholders and no query string;
     drop `event.extra`/`event.contexts` bodies except an explicit allowlist; keep `tags` to a
     fixed safe set. Pure + unit-testable.
   - `scrubBreadcrumb(crumb)` — **RED-TEAM High**: Sentry's default fetch/XHR breadcrumbs record
     PostgREST URLs whose query string carries the search term + record UUIDs. Strip query
     strings AND normalize path params (`/tickets/<uuid>` → `/tickets/:id`) on every `http`
     breadcrumb; drop the breadcrumb entirely if it targets the Supabase host and can't be
     normalized. Return `null` to drop.
   - `setSentryUser(id)`: `Sentry.setUser(id ? { id } : null)` — id only, never email.
   - After init, `setErrorReporter((e) => Sentry.captureException(e))`.
3. `app.tsx`: `<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}
onError={(error, info) => reportError(error, { componentStack: info.componentStack })}>`.
   Import `reportError` from the light reporter module only.
4. `router.tsx` — **RED-TEAM Medium**: `defaultErrorComponent` is currently an inline arrow
   (`router.tsx:27`), which cannot host a hook. Extract a named `RouteErrorReporter({ error })`
   component: `useEffect(() => reportError(error), [error])` then render `<ErrorPage
subTitle={error.message} />`. Guard StrictMode/re-render double-capture with a
   `useRef`-tracked "already reported this error identity" flag (dev double-invoke + fresh
   error objects on re-render would otherwise double-count). Set
   `defaultErrorComponent: RouteErrorReporter`.
5. `vite.config.ts`:
   ```ts
   const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN;
   // plugins: [...existing, sentryEnabled && sentryVitePlugin({
   //   org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT,
   //   authToken: process.env.SENTRY_AUTH_TOKEN,
   //   sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] } })].filter(Boolean)
   // build: { sourcemap: sentryEnabled }
   ```

## Success Criteria

- [ ] Throwing in a shell component (post-init) reports to Sentry and shows `ErrorBoundaryFallback`.
- [ ] A thrown route loader error reports exactly once (StrictMode dev double-invoke handled).
- [ ] `scrubEvent` allowlist test: a free-text ticket subject (no email) in `extra`/message is
      dropped, `request.url` normalized to `:id` with no query string.
- [ ] `scrubBreadcrumb` test: a PostgREST fetch breadcrumb with `?or=(subject.ilike...)` and a
      `/tickets/<uuid>` path is stripped/normalized or dropped.
- [ ] Build with no `SENTRY_AUTH_TOKEN` → plugin skipped, no `.map` in `dist`, build green.
- [ ] Sentry event `user` has `id`, no `email`.

## Risk Assessment

- Risk: allowlist too tight → useful debug context lost. Mitigation: allowlist is explicit and
  reviewable; widen deliberately per field, never by regex.
- Risk: `RouteErrorReporter` re-renders / StrictMode → duplicate captures. Mitigation: `useRef`
  dedup on error identity, effect keyed on `error`.
- Risk: source maps published publicly. Mitigation: maps generated only when uploading, deleted post-upload.
- Security: DSN is public/write-only; auth token is build-time secret, never `VITE_`-exposed.
