# Project Overview & Product Development Requirements

## Product Vision

A **single-tenant help desk SaaS** built to portfolio-grade standards. Customers open tickets → agents resolve them (by team) → admins manage permissions + SLAs.

### Why This Project

Demonstrates senior-level fullstack engineering across:

- **Frontend:** React 19, type-safe routing + state, design system (shadcn/ui), accessibility
- **Backend:** Postgres triggers for domain invariants, RLS for data isolation, realtime subscriptions, Edge Functions for AI
- **Infrastructure:** Zero-cost live demo (Supabase + Cloudflare Pages), MSW for offline dev + testing, no vendor lock-in
- **Testing:** E2E coverage, parity tests (dev/test mirroring prod), accessibility audits
- **DevOps:** GitHub Actions CI/CD, automated Supabase + Cloudflare deploys, free tiers only

### Target Audience

**Recruiters:** Click the live demo link, sign in, explore the product. See working code + design + documentation + CI/CD.

**Interviewers:** Discuss trade-offs (Gemini vs Claude, MSW parity, TypeScript 6 vs 7), explain trigger-based invariants, demo realtime.

## Functional Requirements

### User Management (Admin)

- [x] Create/read/update/delete users
- [x] Assign roles (owner, admin, agent, customer)
- [x] Granular permissions (read ticket, create ticket, assign ticket, view audit, etc.)
- [x] Team membership (agents belong to teams for ticket routing)
- [x] Organization-level settings

### Tickets (Customer + Agent)

- [x] Customer creates ticket (subject, description, attachments, priority — suggested by AI)
- [x] Ticket assigned to agent (by category → default team, or manually)
- [x] Agent works ticket (replies, internal notes, status updates)
- [x] Customer sees public messages only (not internal notes)
- [x] Ticket resolves → automatic 7-day auto-close (can reopen if customer replies)
- [x] Realtime updates on both sides (browser subscriptions, Realtime channel)

### SLA (Service Level Agreement)

- [x] Policies by priority (low=48h, normal=24h, high=8h, critical=2h)
- [x] Due date stamped on create
- [x] SLA clock pauses when status = pending or on_hold
- [x] Breach badge shown in list + detail
- [x] Audit trail of all pause events

### Triage & Routing

- [x] Automatic visibility queue (triage role sees all unassigned)
- [x] Category → default_team mapping (admin-configured)
- [x] Manual assignment override
- [x] Bulk reassignment (admin)

### AI Features (Optional)

- [x] Triage suggestion: subject+description → priority + category (Gemini 3.1 Flash Lite)
- [x] Reply suggestion: thread + canned responses → draft reply
- [x] Summary: thread → one-liner
- [x] Semantic search: ticket text + embeddings → similar tickets (`gemini-embedding-001`)

### Audit Trail

- [x] Immutable log of all state changes (status, assignee, team, category, bulk ops)
- [x] Queryable by admin (table in dashboard)
- [x] Read-only customer view hides internal changes

### Canned Responses (Agent)

- [x] Org-level templates
- [x] Consumable in composer (select + edit)
- [x] Included as context for AI reply suggestions

### Dashboard (Admin)

- [x] Metrics: open backlog, avg first-response, avg resolution, SLA compliance
- [x] Charts: volume over time, SLA breach rate, average resolution time
- [x] Team workload breakdown

### Localization

- [x] Full English + Vietnamese (UI + dates + times + validation messages)
- [x] Locale switcher (persisted)
- [x] Type-safe i18n keys (unknown keys fail at build)

## Non-Functional Requirements

### Performance

- [x] Lighthouse budget: perf ≥90, a11y ≥95, best-practices ≥85
- [x] Route code-splitting (lazy load features)
- [x] List pagination (URL-as-truth, no layout jump)
- [x] Debounced search

### Accessibility

- [x] WCAG 2.1 AA in a real browser (@axe-core/playwright)
- [x] Keyboard navigation (all dialogs, focus trap)
- [x] Alt text on images
- [x] Color contrast ≥4.5:1 (AA)

### Security

- [x] RLS policies (row-level data isolation)
- [x] No secrets in bundle (Gemini key server-side only)
- [x] JWT-based API auth
- [x] Audit trail (compliance)
- [x] CSRF protection (Supabase default)

### Testing

- [x] Unit + component tests (Vitest, ≥75% coverage)
- [x] E2E tests (Playwright, production build)
- [x] MSW parity (every trigger mirrored in mocks)
- [x] Accessibility audits (every PR)

### Reliability

- [x] Zero runtime errors (logged via Sentry if enabled)
- [x] Graceful degradation (AI off → keyword search, MSW → dev mode)
- [x] E2E smoke test (app boots + renders)

## Technical Decisions (ADRs)

Detailed in `docs/adr/`:

- TanStack Router over React Router (type safety, loaders)
- shadcn/ui over antd/MUI (own-the-code, Tailwind-native)
- MSW + Supabase parity (mock is a shipped artifact, not test scaffolding)
- AI via Supabase Edge Functions (keeps secrets server-side)
- Gemini over Claude (Anthropic has no embeddings API; Gemini free tier)
- TypeScript 6 not 7 (typescript-eslint@8 doesn't support TS7 yet)

## Success Metrics

1. **Recruiter experience:**
   - Live demo link works (Supabase backend; may need a few seconds to wake on first hit after idle)
   - Sign-in + ticket exploration in <1 min
   - README + docs + ADRs tell the full story

2. **Code quality:**
   - CI green (lint → typecheck → test → build → e2e → Lighthouse)
   - Coverage ≥75%
   - Lighthouse a11y ≥95
   - Parity test passes (dev/test environment matches production invariants)

3. **Interview readiness:**
   - Live demo works end-to-end (realtime, RLS, AI all active)
   - Can walk through trigger design + RLS + parity test
   - Trade-off discussion points pre-loaded (ADRs explain why Supabase, Gemini, TypeScript 6, etc.)

## Constraints

- **Zero running cost:** All free tiers (Cloudflare, Supabase, Gemini)
- **Single-tenant:** No multi-tenancy complexity
- **Demo data only:** Never handles real user data; Gemini free tier acceptable
- **Personal project:** No external collaborators; full ownership of decisions
- **Portfolio piece:** Code must be clean, documented, and reviewable
- **Supabase free-tier idle pause:** Live demo may need a few seconds to wake after 1+ week idle; acceptable trade-off for free hosting

## Dependencies

| Component        | Service      | Free Tier Constraint            | Mitigated By                                |
| ---------------- | ------------ | ------------------------------- | ------------------------------------------- |
| Frontend deploy  | Cloudflare   | 500 deploys/mo, 1 GiB storage   | One person = ≈10 deploys/mo                 |
| Backend (live)   | Supabase     | Pauses after 1 week idle        | Low traffic (personal CV link); acceptable  |
| Dev/test backend | MSW          | None (in-browser)               | Offline-capable; no network dependency      |
| AI chat + embed  | Gemini free  | 500 RPD (chat), ~1K RPD (embed) | No AI calls in CI/tests; only dev + recruit |
| Analytics        | PostHog free | 5K events/mo                    | Recruiter demo is small traffic             |
| Error tracking   | Sentry free  | 5K errors/mo                    | Demo rarely errors (seeded data)            |

## Roadmap (Future)

**Phase-10 (Beyond Phase-09):**

- Multi-tenant support (org isolation via subdomain)
- Real user upload (move from Gemini free → paid tier, or Claude embeddings via Voyage)
- Stripe integration (billing)
- Production Supabase deploy (replicate free-tier setup)
- Mobile app (React Native)

**Not in scope (for now):**

- Custom fields
- Webhooks + integrations (Slack, Teams)
- Advanced reporting (Looker Studio)
- Self-hosted option

## Implementation Phases

**Completed (Phases 1-8):**

| Phase | Scope                                  | Status  |
| ----- | -------------------------------------- | ------- |
| 01    | Foundation + tooling (React, TS, Vite) | ✅ done |
| 02    | Testing + CI infrastructure            | ✅ done |
| 03    | Data layer (Supabase + MSW)            | ✅ done |
| 04    | Routing (TanStack Router)              | ✅ done |
| 05    | Design system (shadcn/ui)              | ✅ done |
| 06    | Help desk core (tickets, agents)       | ✅ done |
| 07    | AI features + semantic search          | ✅ done |
| 08    | Dashboard analytics                    | ✅ done |

**Current (Phase-09):**

| Task                                | Status  |
| ----------------------------------- | ------- |
| a11y audit + Lighthouse CI          | ⬜ done |
| Overhaul README + write docs        | ⬜ done |
| ADRs (6 decisions)                  | ⬜ done |
| MSW demo deploy (Cloudflare Pages)  | ⬜ done |
| Live backend deploy (Supabase + CF) | ⬜ done |
| Demo reset routine + seeding        | ⬜ done |
| CI badges + final cleanup           | ⬜ done |

## Acceptance Criteria

### Done when:

- [x] README hero screenshot + live links (single Supabase-backed demo)
- [x] `docs/system-architecture.md` (layer breakdown + deployment model)
- [x] `docs/deployment-guide.md` (secrets setup + deploy workflow)
- [x] `docs/code-standards.md` (review checklist — already done, Phase-05)
- [x] `docs/codebase-summary.md` (structure + principles)
- [x] 6 ADRs in `docs/adr/` (decisions + trade-offs)
- [x] `.github/workflows/lighthouse.yml` (perf/a11y/best-practices budgets on PR)
- [x] `.github/workflows/deploy.yml` (Supabase + Cloudflare Pages automation)
- [x] `public/_redirects` (SPA fallback)
- [x] Supabase backend configured (migrations, functions, secrets)
- [x] Cloudflare Pages deployment working (live URL)
- [x] Deep-link refresh test passes (no 404)
- [x] Parity test passes (dev/test ↔ production)
- [x] CI all green
- [x] Recruiter can sign in + explore in <1 min

## Notes

- **MSW is for dev/test fidelity**, not a shipped artifact. Every Postgres trigger has a MSW mirror so local tests see production behavior.
- **Supabase is the live demo** (realtime, RLS, AI all active). Free tier pauses after idle, but acceptable for a personal CV link.
- Parity test (`npm run test:parity`) verifies dev/test stays faithful to production. Any trigger added must have a MSW mirror.
- Document as you go (every phase has its own `phase-XX.md` explaining decisions; ADRs capture trade-offs for recruiters/interviewers).
