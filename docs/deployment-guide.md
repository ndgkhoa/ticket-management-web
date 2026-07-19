# Deployment Guide

## Deployment Strategy

**Live demo (Cloudflare Pages):** Supabase backend (realtime, RLS, presence, AI all live).

**Local dev/test:** MSW (offline, no backend needed). Every Postgres trigger mirrored in MSW so tests + dev stay faithful to live behavior.

**Trade-off:** Supabase free tier pauses after ~1 week idle, so the live demo may need a few seconds to wake on first hit after inactivity. This is acceptable because the app is intentionally single-tenant and low-traffic (personal CV project).

## Prerequisites

- Bun (package manager)
- GitHub repo with Actions enabled
- Cloudflare account (free tier, Pages product)
- Supabase account (free tier, optional for live demo)
- Google AI Studio (free Gemini key, optional for AI features)

## Local Setup

```bash
git clone git@github.com:ndgkhoa/ticket-management-web.git
cd ticket-management-web

# Install dependencies
bun install

# Copy env template
cp .env.example .env

# Start local Supabase (optional; dev works with VITE_API_MODE=msw too)
bun run db:start
bun run db:reset
```

### Environment Variables

**`.env.example`** (copy to `.env`)

```bash
# API mode: "msw" (browser mocks) or "supabase" (live backend)
VITE_API_MODE=msw

# Supabase (required if VITE_API_MODE=supabase)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# AI (optional; UI hides features if not set)
VITE_AI_ENABLED=true
GEMINI_API_KEY=AIzaSy...  # Server-side only (Edge Functions + seed script)
# GEMINI_CHAT_MODEL=gemini-3.1-flash-lite  # optional; pin a stable model id

# Turnstile (optional; login/signup captcha) — public site key is safe in the bundle
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

**Validation:** Zod schema in `src/config/env.ts` fails at boot if vars are missing or malformed.

## Local Development

```bash
# MSW mode (default; works offline)
VITE_API_MODE=msw bun run dev

# Supabase mode (needs db:start + env vars)
VITE_API_MODE=supabase bun run dev

# Production build preview
bun run build
bun run preview
```

Sign in with any demo account (see [README.md](../README.md) for credentials).

## Testing

```bash
# Unit + component tests
bun run test

# Watch mode
bun run test:watch

# Coverage report (must meet floor)
bun run test:cov

# MSW parity check (verifies triggers are mirrored)
bun run test:parity

# E2E tests (requires built dist/ and Playwright installed)
bun run e2e

# E2E UI mode (visual debugging)
bun run e2e:ui

# Accessibility audit (WCAG 2.1 AA)
bun run e2e
```

## Deploy to Production (Supabase + Cloudflare Pages)

**Single workflow (`.github/workflows/deploy.yml`)** handles both backend migrations + frontend build:

1. Push to `main` → GitHub Actions runs
2. Supabase backend: migrations + functions + secrets
3. Frontend: build with Supabase config + deploy to Cloudflare Pages
4. SPA fallback via `public/_redirects` ensures deep links work

### One-Time Setup

#### Supabase Project

1. Create project at `supabase.com` (free tier)
2. Get project ref + anon key from Settings → API
3. Link locally: `supabase link --project-id <ref>`

#### GitHub Secrets & Variables

Settings → Secrets and variables → Actions:

**Secrets:**

- `SUPABASE_ACCESS_TOKEN` (Supabase dashboard → Account → Access Tokens → Create new)
- `SUPABASE_DB_PASSWORD` (database password, generated during project creation)
- `VITE_SUPABASE_URL` (from Settings → API)
- `VITE_SUPABASE_ANON_KEY` (from Settings → API)
- `CLOUDFLARE_API_TOKEN` (Cloudflare dashboard → Account → API Tokens → Create Token)
  - Permissions: `Account.Cloudflare Pages:Edit`
- `GEMINI_API_KEY` (optional, for AI features)

**Variables:**

- `SUPABASE_PROJECT_REF` (project ref from step 1)
- `CLOUDFLARE_PAGES_PROJECT` (Cloudflare Pages project name — create it first)
- (Optional) `VITE_AI_ENABLED=true` if GEMINI_API_KEY is set

#### Cloudflare Pages Project

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Direct Upload
2. Note the project name (e.g., `ticket-help-desk`)

#### Supabase Backend (One-Time Manual Setup)

```bash
# Link repo to Supabase project
supabase link --project-id <your-project-ref>

# Push migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy ai-triage
supabase functions deploy ai-suggest-reply
supabase functions deploy ai-summarize
supabase functions deploy embed-ticket
supabase functions deploy embed-query

# Set Gemini key (if using AI)
supabase secrets set GEMINI_API_KEY=AIzaSy...

# Enable Realtime publications
# (via Supabase dashboard → Realtime → Enable for tables: tickets, ticket_messages)
```

### Automatic Deploy

On every push to `main`:

1. Deploy to Supabase: migrations + functions
2. Frontend build: `VITE_API_MODE=supabase` + env vars from secrets
3. Deploy to Cloudflare Pages: `wrangler pages deploy dist`

**Verify:**

- Push to `main`
- GitHub Actions → `deploy` workflow should run (~2–3 min)
- Cloudflare Pages → Deployments shows new build
- Test the live URL; sign in with demo account
- Test deep link survival: `/tickets/abc` hard refresh should work (not 404)

## Seeding & Demo Accounts

### Generate Seed SQL (Auto on Commit)

Seeded data is auto-generated from fixtures + committed to `supabase/seed.sql`:

```bash
bun run seed:gen      # Regenerate (shouldn't need this unless fixtures change)
bun run seed:check    # Fail if en/vi sync + seed sync fail (part of CI)
```

### Demo Accounts

All seeded with **`password123`**:

| Email                  | Role     | Org | In both MSW + Supabase |
| ---------------------- | -------- | --- | ---------------------- |
| `owner@example.com`    | Owner    | 1   | ✅                     |
| `admin@example.com`    | Admin    | 1   | ✅                     |
| `agent@example.com`    | Agent    | 1   | ✅                     |
| `customer@example.com` | Customer | 1   | ✅                     |

Plus 8 generated agents + 40 customers (Faker-based, seeded for repeatability).

### Reset Demo Data

**Local:**

```bash
bun run db:reset
```

**Production (optional scheduled function):**

- Create Supabase scheduled function calling `seed.sql` + `seed-embeddings.sql`
- Prevents abuse, keeps demo fresh
- Only if you expect many recruiter visits; not required for a personal CV link

## CI/CD Pipeline

**Triggered automatically:**

```
Push to any branch
  └─→ Lint + typecheck + test + build (< 2 min)

PR to main/develop
  ├─→ [Above]
  ├─→ E2E + accessibility (≤ 5 min)
  ├─→ Lighthouse (≤ 2 min)
  └─→ Chromatic (snapshot diff, ≤ 2 min)

Merge to main
  ├─→ Supabase: migrations + Edge Functions (~1–2 min)
  └─→ Cloudflare Pages: frontend build + deploy (~1 min)
```

View results: GitHub → Actions (each run shows logs + artifacts). Cloudflare Pages → Deployments shows build status + live URL.

## Lighthouse Budgets

Checked on every PR; fails PR if regression (configured in `lighthouserc.json`):

```json
{
  "ci": {
    "collect": { "url": ["http://localhost:3000"] },
    "upload": { "target": "temporary-public-storage" },
    "assert": [
      {
        "matchingUrlPattern": ".*",
        "assertions": {
          "categories:performance": { "min": 90 },
          "categories:accessibility": { "min": 95 }, // Hard gate
          "categories:best-practices": { "min": 85 }
        }
      }
    ]
  }
}
```

Run locally before pushing:

```bash
bunx @lhci/cli@latest autorun
```

## Troubleshooting

| Issue                        | Solution                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| Deep link 404s after refresh | Verify `public/_redirects` is deployed (SPA fallback)              |
| "Can't find env var X"       | Run `cp .env.example .env` + fill missing values                   |
| Supabase queries return 403  | Check RLS policies; verify user has org_id + role membership       |
| AI features return 500       | Set `GEMINI_API_KEY` in Supabase secrets + deploy functions        |
| E2E tests fail locally       | Run `bun run build` first (e2e runs against dist/, not dev)        |
| Coverage fails CI            | Run `bun run test:cov` locally; cover uncovered lines              |
| MSW parity test fails        | A DB trigger was added without a MSW mirror; fix in `src/mocks/**` |
| Storybook build fails        | Run `bun run storybook:build` locally; check for missing deps      |

## Monitoring & Analytics (Optional)

**PostHog** (product analytics):

- Set `VITE_POSTHOG_KEY` to enable session recordings + events
- Useful for understanding recruiter behaviour on the CV demo

**Sentry** (error tracking):

- Set `VITE_SENTRY_DSN` to capture errors in production
- Safe for a public demo; shows you what breaks

**Supabase:** Built-in monitoring (realtime edges, DB performance) available in dashboard.

## Cost Breakdown (As of 2026-07)

| Service          | Plan | Monthly Cost | Notes                              |
| ---------------- | ---- | ------------ | ---------------------------------- |
| Cloudflare Pages | Free | $0           | 500 deploys/mo; 1 GiB/mo storage   |
| Supabase         | Free | $0           | Pauses after 1 week idle           |
| Gemini API       | Free | $0           | Content used for model training    |
| GitHub Actions   | Free | $0           | 2K min/mo; this project ~40 min/mo |
| **Total**        |      | **$0**       |                                    |

All services are genuinely free (no credit card, no hidden limits). Supabase free tier **will pause** after ~7 days idle — the live demo then takes a few seconds to wake on the first hit; a `select 1` cron or an occasional visit keeps it warm. This is the trade-off chosen for a fully-live demo over a static MSW build.

## Post-Deploy Verification

After any deploy, manually verify:

1. **MSW demo (CV link):**
   - Click sign-in, use any demo account
   - Navigate tickets → detail
   - Hard refresh (Cmd+Shift+R) deep link — should NOT 404

2. **Live demo (optional Supabase link):**
   - Same as above
   - Open Inspector → Network → subscribe (should see realtime messages)
   - Create new ticket → should appear realtime in another browser tab

3. **Lighthouse:**
   - Run `bunx @lhci/cli@latest autorun` locally
   - A11y score should be ≥95

4. **E2E:**
   - `bun run build && bun run e2e`
   - All specs green

## Rolling Back

- **Cloudflare Pages:** Dashboard → Deployments → click previous build → "Revert"
- **Supabase:** No built-in rollback. To revert schema: `supabase db reset` (destroys data) or manually write a down migration
- **GitHub:** Revert commit + push (re-triggers deploy)

## Further Reading

- `supabase/migrations/` — Schema, RLS, triggers, RPCs
- `.github/workflows/` — CI/CD pipeline
- `docs/system-architecture.md` — Layer breakdown
- `docs/code-standards.md` — Review checklist
- `plans/260715-2241-ticket-management-web-refactor/` — Implementation phases
