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
# API mode: "msw" (browser mocks) or "supabase" (live backend) — default is supabase
VITE_API_MODE=supabase

# Supabase (required if VITE_API_MODE=supabase)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=

# Google OAuth (optional; for production sign-in)
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=

# Cloudflare Turnstile (optional; login/signup captcha)
VITE_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET=

# Gemini AI (optional; UI hides features if not set)
VITE_AI_ENABLED=true
GEMINI_API_KEY=  # Server-side only (Edge Functions + seed script)
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
GEMINI_EMBED_MODEL=gemini-embedding-001

# Sentry (optional; error tracking)
VITE_SENTRY_DSN=

# PostHog (optional; product analytics)
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://eu.i.posthog.com
```

**Validation:** Zod schema in `src/config/env.ts` fails at boot if vars are missing or malformed.

## Local Development

```bash
# Supabase mode (default; needs local db:start + env vars or Supabase credentials)
bun run dev

# MSW mode (works fully offline with mocked API)
VITE_API_MODE=msw bun run dev

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
- `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → Account Home → copy the Account ID)
- `VITE_TURNSTILE_SITE_KEY` (optional, forwarded to build for Turnstile captcha)
- `VITE_SENTRY_DSN` (optional, forwarded to build for error tracking)
- `VITE_POSTHOG_KEY` (optional, forwarded to build for analytics)
- `VITE_POSTHOG_HOST` (optional, forwarded to build for analytics)

**Variables:**

- `SUPABASE_PROJECT_REF` (project ref from step 1)
- `CLOUDFLARE_PAGES_PROJECT` (Cloudflare Pages project name — create it first)

**Server-side secrets (set in Supabase, not GitHub):**

- `GEMINI_API_KEY` — set via `supabase secrets set GEMINI_API_KEY=...` (optional, for AI features)

#### Cloudflare Pages Project

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Direct Upload
2. Note the project name (e.g., `ticket-help-desk`)

#### Supabase Backend (One-Time Manual Setup)

```bash
# Link repo to Supabase project
supabase link --project-id <your-project-ref>

# Push migrations
supabase db push

# Deploy all Edge Functions
supabase functions deploy

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
Push to main or develop
  ├─→ Lint (ESLint) + typecheck (TypeScript)
  ├─→ Lang:check (i18n parity)
  ├─→ Test (Vitest + coverage)
  └─→ Build (Vite)

PR to main/develop
  ├─→ [All above]
  ├─→ E2E (Playwright) + accessibility (@axe-core/playwright, WCAG AA)
  ├─→ Lighthouse (perf/a11y/best-practices budgets)
  ├─→ Chromatic (Storybook snapshot diff)
  └─→ Codecov (coverage report: unit + e2e flags combined)

Merge to main
  ├─→ Deploy (Supabase: migrations + Edge Functions + Cloudflare Pages)
  └─→ Release (semantic-release: version bump, CHANGELOG, GitHub Release)
```

View results: GitHub → Actions (each run shows logs + artifacts). Cloudflare Pages → Deployments shows build status + live URL.

## Lighthouse Budgets

Checked on every PR (via `lighthouse.yml`); posts results as a PR comment with median of 3 runs.

**Configured in `lighthouserc.json`:**

- **URLs tested:** `http://localhost:4173/auth/sign-in` + `/auth/sign-up`
- **Performance:** ≥90 (warn if lower)
- **Accessibility:** ≥95 (hard gate — fail PR if lower)
- **Best practices:** ≥90 (warn if lower)
- **Runs:** 3 consecutive, median reported
- **Server:** `vite preview --port 4173`

Run locally before pushing:

```bash
bun run build
bunx @lhci/cli@0.14.x autorun
```

## Release (Semantic Release)

On push to `main`, `.github/workflows/release.yml` runs `semantic-release`:

1. **Analyze commits:** Read conventional commit messages (feat, fix, refactor, etc.)
2. **Bump version:** Determine next version (major.minor.patch) from commit types
3. **Generate CHANGELOG.md:** Auto-write release notes from commit bodies
4. **Create GitHub Release:** Tag and publish on GitHub
5. **Commit back:** Push `chore(release): x.y.z [skip ci]` to main (no re-trigger)

**NPM publish is disabled** (`. npmPublish: false` in `.releaserc.json`). The app is not an npm package; versioning is for demo tracking only.

## Codecov

Coverage uploaded to Codecov with two flags (configured in `codecov.yml`):

- **`unit`** — Vitest coverage (logic tests via jsdom)
- **`e2e`** — Playwright coverage (UI flows via V8; monocart-coverage-reports + mcr.config.cjs)

Together they reflect real app coverage. The report is **informational** (does not gate the build); the real gate is the Vitest coverage floor in `vitest.config.ts`. Codecov posts a status comment on PRs when coverage moves.

## Commit Conventions

**`commitlint` enforces** (via `commitlint.config.js`):

- **Types:** `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `revert`, `style`
- **Scope required:** Every commit MUST have a scope (e.g., `feat(auth):`, not bare `feat:`). Bare scopes are rejected.
- **Subject max length:** 100 characters
- **Example:** `feat(tickets): add semantic search on ticket embedding`

Failed commitlint blocks the commit hook; `git commit --amend` to fix.

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
