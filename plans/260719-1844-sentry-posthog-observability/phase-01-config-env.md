---
phase: 1
title: Config & Env
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Config & Env

## Overview

Install SDKs and extend the Zod-validated env so every observability var is **optional**
(app boots and runs identically when all are unset). This phase is a hard prerequisite —
phases 2 and 3 read `env.VITE_*` added here.

## Requirements

- Functional: new env vars parse via `src/config/env.ts`; missing = no error, no observability.
- Non-functional: follow the existing optional-when-unset pattern; no secret in a `VITE_` var.

## Architecture

Client vars (inlined into bundle, all optional):

- `VITE_SENTRY_DSN` — Sentry DSN (public by design, like the Supabase anon key).
- `VITE_POSTHOG_KEY` — PostHog **project** API key (public, write-only ingest).
- `VITE_POSTHOG_HOST` — ingest host, default `https://us.i.posthog.com`.

Build-time secrets (NOT `VITE_`-prefixed, never in bundle — used only by the Vite plugin in phase 2):

- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

## Related Code Files

- Modify: `package.json` — add deps.
- Modify: `src/config/env.ts` — add three optional client vars to the schema.
- Modify: `.env.example` — document all six vars with the "why".
- Modify: `.github/workflows/deploy.yml` — forward the new keys to the build (else prod is inert).

## Implementation Steps

1. Install runtime deps: `bun add @sentry/react posthog-js`.
2. Install build dep: `bun add -d @sentry/vite-plugin`.
3. In `src/config/env.ts`, add inside the `z.object({ ... })`:
   ```ts
   VITE_SENTRY_DSN: z.url().optional(),
   VITE_POSTHOG_KEY: z.string().min(1).optional(),
   VITE_POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),
   ```
   Add a short doc comment on each in the file's existing style (public-key rationale).
4. In `.env.example`, add an "Observability (optional)" block: the three `VITE_` vars
   (note leaving them blank disables Sentry/PostHog) + the three build-time Sentry secrets
   (note they gate source-map upload only; safe to omit).
5. **Wire `deploy.yml`** (RED-TEAM Critical — without this the feature is inert in prod because
   Vite inlines `VITE_*` at build time). In the "Build (live Supabase)" step `env:` block add:
   ```yaml
   VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
   VITE_POSTHOG_KEY: ${{ secrets.VITE_POSTHOG_KEY }}
   VITE_POSTHOG_HOST: ${{ secrets.VITE_POSTHOG_HOST }}
   SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
   SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
   SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
   ```
   All are `secrets.*` — empty when unset, so the guard/plugin no-op cleanly (no red build).
   Add these six names to the one-time-setup secret list in the workflow's header comment.

## Success Criteria

- [ ] `bun run build` succeeds with all new vars unset (env parses; defaults applied).
- [ ] `env.VITE_POSTHOG_HOST` resolves to the US default when unset.
- [ ] `tsc -b` clean; no `VITE_`-prefixed secret added.
- [ ] `deploy.yml` Build step forwards all six new keys; header secret list updated.

## Risk Assessment

- Risk: adding a `.optional()` var without a default breaks `env.data` typing downstream.
  Mitigation: only phases 2-3 consume them, guarded by presence checks.
