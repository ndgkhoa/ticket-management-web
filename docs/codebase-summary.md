# Codebase Summary

Single-tenant help-desk SaaS built with React 19, TypeScript 6, Vite 8, Supabase, and Gemini AI.

## Structure

```
src/
  app/              Root shell — providers, router
  routes/           TanStack Router tree (type-safe)
  features/         Feature-based modules
    admin/          RBAC, users, roles, permissions, categories, canned responses
    auth/           Login, logout, session (Supabase Auth)
    tickets/        Ticket lifecycle, list, detail, composer, AI features
    dashboard/      Analytics, charts (Recharts)
  components/       Shared UI — primitives (shadcn/ui), layouts, fallbacks
  config/           Zod-validated env vars
  lib/              Configured clients — Supabase, TanStack Query
  utils/            Pure helpers (cn, format, etc.)
  stores/           Global Zustand state (auth session, preferences, language)
  mocks/            MSW handlers + fixtures (seeded demo data)
  i18n/             i18next config + generated locale bundles (en/vi)
  testing/          Vitest setup, shared render helpers
  types/            Global types

supabase/
  migrations/       Schema, RLS policies, triggers, RPCs, pgvector
  functions/        Deno-based Edge Functions (AI triage, embeddings)
  seed.sql          Seeded demo data (auto-generated from fixtures)

.github/workflows/
  ci.yml            Lint → typecheck → test → build → e2e → Lighthouse
  deploy.yml        Supabase backend + frontend → Cloudflare Pages
  lighthouse.yml    Perf/a11y budgets on PRs

e2e/
  *.spec.ts         Playwright tests + accessibility scans (@axe-core/playwright)

.storybook/         Chromatic-enabled story previews
```

## Core Principles

**Database is the source of truth.** Domain invariants (SLA stamping, triage visibility, status lifecycle, audit trail) live in Postgres triggers + RLS, never client-side validation. This enforces correctness across all write paths, including bulk operations.

**MSW parity is a shipped artifact.** Because triggers don't run under MSW, every database trigger has a mirrored mock in `src/mocks/**`. Tests and the static demo stay faithful to live behaviour — parity is guarded by an integration test (`test:parity` script). This removes the "works in dev but not prod" failure mode.

**Type safety end-to-end.** Routes, search params, API contracts, environment variables, and i18n keys are all validated at compile time via Zod and TypeScript.

## Stack

- **Frontend:** React 19, Vite 8, TypeScript 6 (strict)
- **Routing:** TanStack Router 1.170 (type-safe routes + loaders)
- **State:** TanStack Query 5 (server) + Zustand (client)
- **UI:** shadcn/ui + Tailwind CSS 4 (dark mode, cmdk)
- **Forms:** TanStack Form 1.33 + Zod 4
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage, Edge Functions, pgvector)
- **API mock:** MSW 2 (test suite + static demo)
- **AI:** Gemini 3.1 Flash Lite + `gemini-embedding-001` via Supabase Edge Functions
- **Localization:** i18next + YAML→TypeScript code generation (en/vi)
- **Charts:** Recharts
- **Testing:** Vitest, Playwright, @axe-core/playwright
- **Quality:** ESLint flat + Prettier, Husky + lint-staged + commitlint

## Key Files

| File                                      | Purpose                                    |
| ----------------------------------------- | ------------------------------------------ |
| `src/config/env.ts`                       | Zod schema for all env vars; fails at boot |
| `src/app/router.tsx`                      | TanStack Router config + routes import     |
| `src/features/<feature>/api/*.ts`         | Queries/mutations; server-state layer      |
| `src/features/<feature>/schemas/*.ts`     | Zod schemas + `z.infer` types              |
| `src/features/<feature>/components/*.tsx` | Feature UI components                      |
| `src/mocks/handlers/**/*.ts`              | MSW handlers (mirrors all APIs)            |
| `src/mocks/fixtures/*.ts`                 | Seeded demo data (Faker)                   |
| `supabase/migrations/*`                   | Schema + RLS + triggers + RPCs             |
| `supabase/functions/`                     | Edge Functions (triage, reply, embed)      |
| `supabase/seed.sql`                       | Generated from fixtures; auto-committed    |
| `.github/workflows/ci.yml`                | CI gate (lint/type/test/build/e2e)         |
| `.github/workflows/deploy.yml`            | Supabase + Cloudflare Pages deploy         |
| `lighthouserc.json`                       | Perf/a11y/best-practices budgets           |

## Demo Accounts

All seeded with password **`password123`** in MSW mode:

| Email                  | Role     | Access                               |
| ---------------------- | -------- | ------------------------------------ |
| `owner@example.com`    | Owner    | Everything (admin surface + tickets) |
| `admin@example.com`    | Admin    | Users, org, all tickets              |
| `agent@example.com`    | Agent    | Team tickets + internal notes        |
| `customer@example.com` | Customer | Own tickets only                     |

Plus 8 generated agents + 40 generated customers for realistic demo data.

## Data Model (Highlights)

- **Users:** RBAC via roles + granular permissions
- **Tickets:** Status (open, pending, on_hold, solved, closed), priority (low, normal, high, urgent), SLA (due_at, sla_paused_at, sla_paused_ms)
- **Teams:** Agents assigned to teams; triage routes by category → default_team
- **Activities:** Public messages (customer-visible), internal notes (agent-only)
- **Attachments:** Uploaded to Supabase Storage; mirrored under MSW for dev/test
- **Audit trail:** DB-triggered event log (user, action, entity, delta, timestamp)
- **SLA policies:** Default durations by priority; pause logic for pending/on_hold states
- **Canned responses:** Org-level templates consumable by composer + AI reply generator

## Realtime Features

Subscriptions to `ticket_messages` + realtime presence. Requires Supabase mode (MSW simulates subscriptions).

## AI & Semantic Search

- **Triage:** subject+description → suggested priority + category (Gemini 3.1 Flash Lite, JSON-constrained)
- **Reply suggestion:** thread + canned responses → draft agent reply
- **Summary:** thread → short summary
- **Semantic search:** `match_tickets()` RPC with `pgvector` + `RETRIEVAL_DOCUMENT` embeddings
- All secrets stay server-side (Edge Functions); browser never holds AI keys

## Deployment

Deployed live on **Supabase + Cloudflare Pages** via `.github/workflows/deploy.yml` on push to main: `supabase db push` + `functions deploy`, then a `supabase`-mode frontend build → Pages. Supabase free tier pauses after ~1 week idle, so the first hit after a long gap may wake slowly.

MSW (`VITE_API_MODE=msw`) is the local-dev + test backend, not deployed; parity with the live triggers is guaranteed by a test.

## CI/CD

- **Lint + typecheck + test + build:** Every push (fast gate)
- **E2E + accessibility:** Every PR (slower, quota-consuming)
- **Lighthouse budgets:** Every PR (perf/a11y/best-practices)
- **Chromatic:** Storybook diff tracking (5K snapshots/month on free tier)
- **Deploy:** On merge to main → Supabase backend + Cloudflare Pages

## i18n

Routes + search params + UI text + date/time formats. Translations generated from YAML → TypeScript, verified by `lang:check` script. Omitting a key breaks the build. Language choice persisted in Zustand.

## Testing Strategy

- **Unit + component:** Vitest + Testing Library on jsdom
- **MSW parity:** Integration test ensures triggers are mirrored in mocks
- **E2E:** Playwright against production build (`vite build` output)
- **Accessibility:** WCAG 2.1 AA in real browser (not jsdom — contrast detection requires layout)
- **Lighthouse:** Perf/a11y/best-practices budgets; fails PR on regression
- **Storybook:** Primitive + feature components with Chromatic diffs

## Review Checklist

All enforced by tooling:

- Conventional commits (commitlint)
- Lint + format on staged files (Husky + lint-staged)
- Import order, no circular deps (ESLint import-x)
- Type-only imports explicit (@typescript-eslint)
- Architecture boundaries (no-restricted-imports)
- Baseline a11y (jsx-a11y)
- Unknown i18n keys fail build (augmented type)
- Env vars validated at boot (Zod)
- Coverage floor enforced (Vitest)
- WCAG AA in real browser (axe + Playwright)
- App boots end-to-end (e2e smoke test)
