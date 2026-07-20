# ticket-management-web

[![CI](https://github.com/ndgkhoa/ticket-management-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ndgkhoa/ticket-management-web/actions/workflows/ci.yml)
[![Deploy](https://github.com/ndgkhoa/ticket-management-web/actions/workflows/deploy.yml/badge.svg)](https://github.com/ndgkhoa/ticket-management-web/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/ndgkhoa/ticket-management-web/graph/badge.svg)](https://codecov.io/gh/ndgkhoa/ticket-management-web)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

A **production-grade single-tenant help desk** built as a portfolio project. Customers open tickets → agents resolve them (by team) → admins manage permissions and SLAs. Full Supabase backend deployed live; MSW for local dev + tests.

## Demo Accounts

Run it locally and sign in with any account below — all seeded
with password **`password123`**:

| Email                  | Role     | Access                                  |
| ---------------------- | -------- | --------------------------------------- |
| `owner@example.com`    | Owner    | Everything (admin + all tickets)        |
| `admin@example.com`    | Admin    | Users, organization, every ticket       |
| `agent@example.com`    | Agent    | Team tickets + internal notes only      |
| `customer@example.com` | Customer | Own tickets only (read-only for agents) |

---

## Stack

**Frontend:** React 19 · Vite 8 · TypeScript 6 · TanStack Router + Query · Zustand · shadcn/ui + Tailwind CSS 4 · Zod · i18next (en/vi) · Recharts

**Backend:** Supabase — Postgres, Auth, Realtime, Storage, pgvector · Edge Functions (Deno) for Gemini AI · row-level security · Postgres triggers for domain invariants (SLA stamping, triage routing, status lifecycle, audit trail)

**Quality:** Vitest + Testing Library · Playwright + @axe-core/playwright (WCAG 2.1 AA) · Storybook + Chromatic (visual regression) · Codecov (coverage tracking) · MSW (offline dev + tests) · ESLint + Prettier + Husky · Lighthouse CI · semantic-release (automated versioning) · GitHub Actions

---

## Features

### Tickets & Workflow

- Customers open tickets (subject, description, attachments, priority)
- AI triage suggests priority + category; auto-routed to a team by category
- Agents reply publicly or leave internal notes; realtime updates + presence
- SLA clock runs and pauses while pending/on_hold; auto-reopen on reply, auto-close after 7 days

### Agent Tooling

- Triage queue for unassigned tickets
- Bulk assignment + team routing
- Canned responses in the composer
- AI-suggested replies + thread summary (Gemini)
- Semantic search over ticket embeddings (pgvector)

### Admin

- RBAC — roles + granular permissions
- Team membership + category → team routing
- SLA policy editor
- Canned-response library
- Immutable audit trail

### Dashboard

- Role-scoped KPIs (open backlog, avg first-response, avg resolution, SLA compliance %)
- Charts: daily volume, status/priority/category breakdown, agent performance
- 7/30/90-day window; metrics aggregated in Postgres, scoped by RLS

### Cross-Cutting

- English + Vietnamese (type-safe i18n; unknown keys fail the build)
- WCAG 2.1 AA in a real browser
- Dark mode + read-only customer view
- Optional observability (Sentry errors + PostHog analytics/replay), PII-scrubbed

---

## Local Setup

**Requirements:** Bun · Node 24+ · Docker (only for local Supabase)

```bash
git clone git@github.com:ndgkhoa/ticket-management-web.git
cd ticket-management-web
bun install
cp .env.example .env

# Run fully in-browser — mocks + seeded demo data, no backend:
VITE_API_MODE=msw bun run dev

# Or run against local Supabase (Docker) to exercise realtime/RLS:
bun run db:start && bun run db:reset && bun run dev
```

Open `http://localhost:5173` and sign in with a demo account. The app defaults to `supabase` mode
(needs the `VITE_SUPABASE_*` vars); set `VITE_API_MODE=msw` to run entirely in the browser. All env
vars live in `.env.example`, validated by a Zod schema at boot.

**Common commands:** `bun run test` (unit) · `bun run e2e` (Playwright) · `bun run test:cov`
(coverage) · `bun run db:reset` (reseed) · `bun run lint`

---

## Documentation

- **[System Architecture](docs/system-architecture.md)** — layers, data flow, RLS/triggers, CI/CD
- **[Codebase Summary](docs/codebase-summary.md)** — structure, principles, key files, data model
- **[Deployment Guide](docs/deployment-guide.md)** — local setup, Cloudflare Pages + Supabase, secrets
- **[Architecture Decisions](docs/adr/)** — trade-offs: router, shadcn, MSW parity, Gemini, TS 6, semantic-release, observability, deploy
- **[AI Features](docs/ai-features.md)** — Gemini integration, semantic search, rate limits
- **[Code Standards](docs/code-standards.md)** — naming, patterns, architecture rules (ESLint-enforced)
- **[Project Overview / PDR](docs/project-overview-pdr.md)** — vision, requirements, success criteria

---

## License

[MIT](LICENSE) © ndgkhoa
