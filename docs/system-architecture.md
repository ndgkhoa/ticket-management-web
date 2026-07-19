# System Architecture

## Overview

Single-tenant help desk — customer → agent (by team) → admin. All domain invariants enforced at the database layer via Postgres triggers + RLS. Client renders state, never enforces rules.

```
Dev: MSW (local)              Deployed: Supabase (live)
┌──────────────────┐          ┌─────────────────────┐
│   Browser (React)│          │   Browser (React)   │
│   • MSW handlers │          │ • Supabase backend  │
│   • fixtures     │          │                     │
│   (no network)   │          │ Realtime, RLS, AI   │
└──────────────────┘          └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Supabase (cloud)   │
                              │                     │
                              │  • Postgres (RLS)   │
                              │  • Auth (GoTrue)    │
                              │  • Realtime         │
                              │  • Storage          │
                              │  • Edge Functions   │
                              │  • pgvector         │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Gemini API         │
                              │  (3.1 Flash Lite)   │
                              │  (embedding-001)    │
                              └─────────────────────┘
```

**Key difference:** Dev uses MSW (offline); Production uses live Supabase. Every Postgres trigger has a MSW mirror so dev/test behavior matches production.

## Layers

### 1. Client (Browser)

**Tech:** React 19, Vite 8, TypeScript 6, shadcn/ui + Tailwind CSS 4

**State management:**

- **Server state** (TanStack Query): API responses, cached + synced
- **Client state** (Zustand): session, preferences, language

**Routing:** TanStack Router with type-safe routes, search-param validation, loaders

**Data modes (build-time config):**

- **MSW (local dev + test suite):** All APIs answered in-browser; no network calls; offline-capable
- **Supabase (production deployment):** Live backend — Auth, Realtime, RLS, Edge Functions all active

### 2. Backend — Supabase

#### Database (Postgres)

**Schema:** profiles, roles, permissions, role_permissions, user_roles, teams, team_members, categories, tags, tickets, ticket_messages, ticket_events, ticket_tags, attachments, sla_policies, canned_responses, saved_views

**RLS policies:** Row-level security scoped to organization + role. Every query runs under the caller's own RLS, so data leaks are prevented at the DB layer.

**Triggers:** Enforce domain invariants

- SLA stamping: ticket create → set `due_at` from policy
- Triage visibility: new ticket → auto-assign to triage queue + trigger visibility event
- Status lifecycle: reopen on customer reply (if solved), auto-close after 7 days (if solved)
- SLA clock pause: when status = pending or on_hold, `sla_paused_at` stops the clock
- Audit trail: every write (create/update/delete on ticket, activity, assignee, team, category) logged to `ticket_events`

**Realtime:** Realtime on `tickets` + `ticket_messages`, plus presence channels for subscription-based updates.

**Semantic search:** `pgvector` extension + `match_tickets()` RPC (embeddings via `RETRIEVAL_DOCUMENT` context), `similar_tickets()` RPC.

#### Auth (Supabase Auth)

- Email + password (demo) + OAuth (Google — production)
- Session token → JWT claims include `user_id`, `org_id`, `role`
- MSW mode: mocks GoTrue locally; same seed accounts work in both modes

#### Storage

Ticket attachments uploaded to Supabase Storage bucket. RLS policies restrict to org + uploader/viewers.

#### Edge Functions (Deno)

Server-side runners holding `GEMINI_API_KEY` (never client-side).

- `ai-triage`: POST subject+description → Gemini, returns JSON `{ priority, category }`
- `ai-suggest-reply`: POST thread+canned_responses → Gemini, returns markdown reply draft
- `ai-summarize`: POST thread → Gemini, returns short summary
- `embed-ticket`: POST ticket_id → calls `gemini-embedding-001`, stores vector in `tickets.embedding`
- `embed-query`: POST query_text → returns `vector[1536]` for semantic search

All functions require valid JWT (`verify_jwt` default); fail gracefully if key missing or API error.

### 3. Demo Data & Fixtures

**Seed design:** Faker-based, deterministic, independent per module (no shared global state).

Generates:

- 4 seeded demo users (owner, admin, agent, customer) — always same
- 8 additional agents + 40 customers (generated variation for realistic demo)
- ~500 tickets (varied priority, status, SLA state, teams, assignees, messages)
- ~1000 messages (public replies + internal notes across the ticket lifecycle)
- Canned responses (org-level templates)
- SLA policies (defaults by priority)

**Output:** `supabase/seed.sql` (generated from fixtures, committed). Deployed on `db reset`.

**MSW sync:** MSW handlers read same fixtures → static demo and tests stay in sync with DB seed by construction.

**Parity test:** `npm run test:parity` verifies every DB trigger has a MSW mirror.

## Feature Breakdown

### Authentication

- Sign-in via email/password (demo) or Google OAuth (production)
- Session stored in Zustand (`authStore`)
- JWT used for all API calls + Edge Functions
- MSW mode: mocks Auth completely; GoTrue layer is stubbed

### Tickets

**Lifecycle:**

1. Customer creates ticket → `status = open`, `due_at` stamped by trigger
2. Agent (or triage) assigns → `status stays open, now assigned to a team`, visible to team
3. Agent replies + marks solved → `status = solved`
4. Customer replies → `status = open` (trigger auto-reopens a solved ticket)
5. After 7 days solved with no reply → `status = closed` (trigger auto-closes)
6. Admin can force close at any time

**Visibility:** Public messages shown to customer; internal notes shown to agents + admin only.

**SLA:**

- `due_at`: set on create (policy by priority)
- `sla_paused_at`: when status in (pending, on_hold), clock pauses
- `breached`: boolean, computed on query; alerts in badge + list

**Team assignment:** By category → default_team routing (admin-defined), or manual assignment.

### Activities (Messages)

Every message on a ticket is an `activity` row with:

- `type`: "message" (public) or "note" (internal)
- `body`: rich text (Tiptap → HTML)
- `created_by`: user_id
- `attachments`: array of file refs

### Audit Trail

`ticket_events` table (auto-written by trigger) logs:

- Every ticket status/priority/team/category change
- Every user bulk action
- Timestamp, actor, entity_id, action, delta (JSON)

Queryable by admin; read-only customer view omits internal notes + admin actions.

### Canned Responses

Org-level templates. Consumed by:

- Composer (user manually selects + edits)
- AI suggest-reply (included as context to Gemini)

### SLA Policies

Admin-defined default `due_at` offsets by priority. Applied on ticket create.

### Dashboard

Metrics card + time-series charts (Recharts):

- Volume (created vs resolved per day)
- Average resolution time
- SLA breach rate
- Team workload

All queries RLS-scoped; admin sees all, agent sees own team only.

### Admin Surface

- User management (RBAC)
- Organization settings
- Category management + team routing
- Canned responses
- SLA policies
- Audit trail browser

## API Contract

**HTTP methods:**

- GET: fetch (queries)
- POST: create/action
- PATCH: partial update
- DELETE: remove

**Authentication:** Bearer token (JWT)

**Response format:**

```json
{
  "data": {...} | [...],
  "error": null | "message"
}
```

**Validation:** Zod schemas colocated with queries/mutations; unknown fields rejected.

## Deployment Model

### Live Demo (Cloudflare Pages + Supabase)

```
Cloudflare Pages (frontend)
    ↓
    ├─ dist/ (vite build with VITE_API_MODE=supabase)
    ├─ public/_redirects (SPA fallback: /* → /index.html)
    └─ env from GitHub secrets:
        ├─ VITE_SUPABASE_URL
        ├─ VITE_SUPABASE_ANON_KEY
        └─ VITE_AI_ENABLED
             ↓
      Supabase (live backend)
         ├─ Database (Postgres + RLS + triggers)
         ├─ Auth (GoTrue)
         ├─ Storage
         ├─ Realtime
         └─ Edge Functions (Deno)
```

Full realtime, RLS, and AI live. Same seed data in every build (via `supabase db reset`).

**Trade-off:** Supabase free tier pauses after ~1 week idle, so the demo may need a few seconds to wake on first hit after inactivity.

### Local Dev & Test (MSW)

```
Browser (dev server or e2e test)
    ↓
    ├─ vite dev with VITE_API_MODE=msw
    └─ MSW handlers in src/mocks/**
        ├─ Mirrors Postgres triggers (deterministic)
        ├─ Mirrors Edge Functions (seeded responses)
        └─ Mirrors Auth (GoTrue mock)
```

Offline-capable, no network calls, instant. Every Postgres trigger has a MSW mirror so parity is guaranteed by test.

## CI/CD Pipeline

```
Push to any branch
  │
  ├─→ Lint (ESLint)
  │    ├─ Import order, circular deps
  │    ├─ Type-only imports
  │    ├─ Arch boundaries (no-restricted-imports)
  │    └─ Baseline a11y (jsx-a11y)
  │
  ├─→ Typecheck (TypeScript)
  │
  ├─→ Tests (Vitest)
  │    ├─ Unit + component (jsdom)
  │    ├─ MSW parity check
  │    └─ Coverage floor enforced
  │
  └─→ Build (Vite)
       ├─ MSW build (VITE_API_MODE=msw)
       └─ TypeScript emit

─────────────────────────────────────

PR to main/develop
  │
  ├─→ [All above]
  │
  ├─→ E2E (Playwright)
  │    ├─ Against production build (dist/)
  │    ├─ Smoke tests
  │    └─ Domain-gaps tests (triage, SLA, lifecycle, etc.)
  │
  ├─→ Accessibility (@axe-core/playwright)
  │    └─ WCAG 2.1 AA in real browser
  │
  └─→ Lighthouse
       ├─ Perf budget: 90
       ├─ A11y budget: 95 (hard gate)
       └─ Best-practices: 85

─────────────────────────────────────

Merge to main
  │
  ├─→ Deploy to Supabase (migrations + functions)
  │    └─ Push schema, triggers, RPCs, Edge Functions
  │
  └─→ Deploy to Cloudflare Pages (frontend)
       ├─ Build (VITE_API_MODE=supabase)
       ├─ Inject env secrets
       └─ wrangler pages deploy dist
```

## Security Model

**Public keys in bundle:** Supabase anonymous key + Turnstile public key (safe by design).

**Server-side secrets:** `GEMINI_API_KEY` (Edge Functions only), database service role (backend only).

**RLS as the firewall:** No row is readable/writable by default. Every row is gated by org + role + row-level rules (org_id, created_by, assignment, team membership, etc.). Tests verify RLS policies block unauthorized access.

**Audit trail:** Immutable event log of all state changes; used for compliance + debugging.

**Demo data reset:** Scheduled function (optional) to reset seeded accounts + tickets, preventing abuse or stale data.

## Scalability Constraints

**Single-tenant by design:** This SPA is deployed per organization, not shared. No multi-tenancy complexity.

**Cloudflare Pages:** Free tier 500 deploys/month (preview-per-PR consumes budget). Fine for one person; worth knowing for scale.

**Supabase:** Free tier pauses after 1 week idle. Not suitable for production but fine for a demo link + live interview demo.

**Gemini free tier:** 500 RPD (chat), ~1K RPD (embeddings). Steady-state usage is zero (CI makes no AI calls); only dev + recruiter traffic hits it.

**Total running cost:** $0 (all free tiers). Scalable to modest production use with minimal paid service upgrades.
