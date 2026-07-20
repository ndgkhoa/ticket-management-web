# ADR-0009: Cloudflare Pages + Supabase for the Live Deploy

**Date:** 2026-07-19 | **Status:** Accepted | **Priority:** P2

## Context

The app runs in two modes: an offline **MSW** demo (no backend) and a live **Supabase** deployment. Shipping the live one means hosting two things on every push to `main`:

1. A **static SPA** — the Vite build output (a router-driven client bundle).
2. A **backend** — Supabase Postgres (schema, RLS, triggers, pgvector RPCs) plus Deno **edge functions** for the AI features.

The requirement: one CI job that pushes database migrations, deploys edge functions, and uploads the built frontend — reproducibly, from `main`, with secrets kept out of the client.

## Decision

Host the SPA on **Cloudflare Pages** (Direct Upload via `cloudflare/wrangler-action`) and the backend on **Supabase**, both shipped from a single `.github/workflows/deploy.yml` on push to `main`.

## Why This Split

### The frontend is a static bundle — a CDN is the right home

A TanStack-Router SPA compiles to static assets. It doesn't need a Node server, SSR, or serverless functions at the host layer — the "server" is Supabase. Cloudflare Pages serves the built bundle from the edge CDN, which is exactly the shape of the artifact.

The build runs against **live Supabase env** and uploads via wrangler:

```yaml
- name: Build (live Supabase)
  run: bun run build
- name: Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
```

Direct Upload (rather than Cloudflare's Git integration) keeps the deploy inside the same GitHub Actions job that just ran migrations, so the frontend never ships ahead of the schema it expects.

### Supabase is the backend, so it deploys with the app

The same job links the project and pushes both halves of the backend before the frontend goes out:

```yaml
- run: supabase link --project-ref "${{ vars.SUPABASE_PROJECT_REF }}"
- run: supabase db push # migrations: schema, RLS, triggers, RPCs
- run: supabase functions deploy # all edge functions at once
```

Ordering matters: **migrations → functions → frontend**. The database contract goes first, then the functions that depend on it, then the client that calls both. A frontend that reached users before its migration would parse against a schema that isn't there yet.

### Secrets stay server-side

The Gemini key is **never** a frontend build var. It's set once on Supabase (`supabase secrets set GEMINI_API_KEY=...`) and read only inside edge functions. The client build receives only public `VITE_*` values (Supabase URL/anon key, Turnstile site key, Sentry DSN, PostHog key) — all of which are safe to ship because they're guarded by RLS, domain rules, or are publishable by design.

## Trade-Offs

| Aspect                   | Cloudflare Pages + Supabase (chosen) | Vercel/Netlify + Supabase | Full-stack platform          |
| ------------------------ | ------------------------------------ | ------------------------- | ---------------------------- |
| **Static SPA hosting**   | Edge CDN, generous free tier         | Also good                 | Overkill for a static bundle |
| **Backend**              | Supabase (owns DB + functions)       | Same                      | Coupled to the platform      |
| **One-job deploy**       | ✅ migrations + functions + upload   | ✅ possible               | ✅ but more lock-in          |
| **Frontend/DB ordering** | Explicit in one job                  | Explicit in one job       | Platform-managed             |
| **Vendor lock-in**       | Low (static upload + OSS Supabase)   | Low                       | Higher                       |
| **Decision**             | **Chosen**                           | Viable alternative        | Not needed                   |

Cloudflare vs Vercel/Netlify for a _static_ bundle is close to a coin flip; Cloudflare Pages was chosen for its free-tier bandwidth and clean `wrangler-action` Direct Upload that slots into the existing job. The meaningful decision is **static-CDN-frontend + Supabase-backend**, not the specific CDN.

## Alternatives Considered

### Vercel or Netlify for the frontend

Equally capable of hosting the SPA and wiring a deploy from CI. Rejected only on preference — Cloudflare's free bandwidth and Direct Upload flow fit the single-job pipeline without adding a Git integration to manage.

### Cloudflare Git integration (auto-build on push) instead of Direct Upload

Cloudflare would build and deploy the frontend itself on push. Rejected: it decouples the frontend deploy from the migration/functions steps, reintroducing the risk that the client ships before its schema. Direct Upload keeps all three steps in one ordered job.

### A single full-stack platform (frontend + DB + functions)

Fewer vendors, but Supabase already owns Postgres + RLS + pgvector + edge functions, and the frontend is just static files. Folding everything into one platform trades that clean split for more lock-in and no real gain.

## Related Decisions

- **ADR-0003** (MSW/Supabase parity): the reason there are two modes at all — MSW for offline dev/tests, live Supabase for this deploy.
- **ADR-0004** (AI via Edge Functions): the edge functions this job deploys; the same reason the Gemini key stays server-side.
- **ADR-0008** (Observability): the `VITE_SENTRY_DSN` / `VITE_POSTHOG_*` build vars forwarded here are the public half of that decision.

## Rationale

The artifact dictates the host: a static SPA belongs on a CDN, a database + functions belong on Supabase. One CI job ties them together in the only safe order — schema, then functions, then frontend — and keeps every real secret on the server. It's the least-moving-parts pipeline that still ships a genuinely live, RLS-guarded, AI-backed app on each merge to `main`.

---

**Brought to you by a recruiter reading your pipeline and thinking: "They deploy the database, the functions, and the frontend in one ordered pass — and the API keys never touch the browser."**
