# ticket-management-web — Production Refactor Plan

Transform an old junior React boilerplate into a **production-grade, single-tenant Help Desk / Ticketing SaaS** that showcases senior-level frontend engineering for CV.

## Product

Single-tenant help desk. **Customer** opens tickets → **Agent** resolves (by team) → **Admin/Owner** administers. RBAC (roles + granular permissions) is meaningful here. SLA timers, realtime updates, internal notes vs public replies, AI triage/reply/summary.

Repo: `ticket-management-web` (GitHub `ndgkhoa/ticket-management-web`, already renamed).

## Target Stack

Versions verified against npm on 2026-07-15 — full table + required usage changes in [phase-01](phase-01-foundation-tooling.md). Latest is adopted **only where the ecosystem supports it** (TypeScript 7 is deferred: `typescript-eslint@8` peers `typescript <6.1.0`, so TS 7 falls outside its supported range — see the phase-01 note; type-aware lint itself is off today and enabled in Phase 05).

- **Core:** React 19.2, TypeScript 6.0 (strict), Vite 8 (Rolldown)
- **TanStack:** Router 1.170 · Query 5.101 · Table 8.21 · Form 1.33
- **UI:** shadcn/ui + Tailwind CSS 4.3 (own design system), dark mode, cmdk
- **Validation:** Zod 4 (forms + env + API contracts + URL search params)
- **i18n:** i18next + react-i18next (keep existing), **type-safe keys**, full `en` + `vi`, language switcher persisted in Zustand
- **Client state:** Zustand (auth/preferences) — clear split from server state (Query)
- **Backend-less API:** Supabase (Postgres, Auth, Realtime, Storage, Edge Functions, pgvector) as live; **MSW** as mock + test contract
- **AI:** Gemini API via Supabase Edge Function — **Gemini 3.1 Flash Lite** (triage, suggested reply, summary) + `gemini-embedding-001` (semantic search). Free tier covers both; Flash Lite is the only free text model with a workable daily quota (500 RPD vs 20 for 3.5 Flash — see phase-07). Chosen over Claude for two reasons: free, and **Anthropic has no embeddings API at all** (their docs point to Voyage AI), so a Claude-only stack couldn't do semantic search regardless of budget. Caveat: Gemini's free tier uses submitted content to improve their products — acceptable here because all data is seeded demo tickets, and a blocker the day real user data exists.
- **Rich content:** Tiptap editor, Supabase Storage attachments
- **Charts:** Recharts/Tremor (dashboard analytics)
- **Testing:** Vitest + Testing Library + jest-axe, Playwright (e2e), MSW
- **Quality/CI:** ESLint flat + Prettier, Husky + lint-staged + commitlint, Dependabot, GitHub Actions (lint→typecheck→test→build→e2e→Lighthouse→Chromatic), Cloudflare Pages preview deploys, Storybook + Chromatic. Quota-consuming jobs run on PRs only — see phase-02

## Conventions (enforced across all phases)

See `code-standards.md`. Key rules:

- **Files:** kebab-case, descriptive — including entry files (`app/provider.tsx`, not `AppProviders.tsx`). **Vars/fns:** camelCase. **Component/type symbols:** PascalCase. Kill leaked backend PascalCase fields (`Id`→`id`).
- **Architecture:** feature-based — `features/<feature>/{api,schemas,hooks,components,pages,constants,stores}` (closed set; server-state hooks live in `api/` next to their fetcher; types are `z.infer` from `schemas/`). Cross-cutting split: `config/` = values, `lib/` = configured clients, `utils/` = pure helpers. Routing = `app/router.tsx` + thin `routes/**`. Barrel **only** at each feature's public boundary. Boundaries enforced by `no-restricted-imports`, not by good intentions.
- **Server state = TanStack Query only** (queryOptions + key factories, optimistic mutations): `useSuspenseQuery` for detail, `useQuery` + `placeholderData: keepPreviousData` for paginated lists (v5 drops `placeholderData` from the suspense hook). **Client state = Zustand only.** No overlap.
- **Forms:** TanStack Form + Zod schema colocated. **Routing:** type-safe routes, loaders (`ensureQueryData`), `beforeLoad` auth/RBAC guards, typed search params.
- **Lists:** one List UX contract for every table — URL-as-truth, debounced search, page→1 reset on filter change, persisted page size, no layout jump, distinct empty vs no-results. One shared list-query contract (Phase 03) behind them all.
- Files under ~200 LOC; split by concern. Descriptive comments explain _why_.

## Phases

| #   | Phase                                                              | Status  |
| --- | ------------------------------------------------------------------ | ------- |
| 01  | [Foundation & tooling](phase-01-foundation-tooling.md)             | ✅ done |
| 02  | [Testing & CI infrastructure](phase-02-testing-ci.md)              | ✅ done |
| 03  | [Data layer — Supabase + MSW](phase-03-data-layer-supabase-msw.md) | ✅ done |
| 04  | [Routing — TanStack Router](phase-04-routing-tanstack-router.md)   | ✅ done |
| 05  | [Design system — shadcn/ui](phase-05-design-system-shadcn.md)      | ⬜ todo |
| 06  | [Help desk core features](phase-06-helpdesk-features.md)           | ⬜ todo |
| 07  | [AI features + semantic search](phase-07-ai-features.md)           | ⬜ todo |
| 08  | [Dashboard analytics](phase-08-dashboard-analytics.md)             | ⬜ todo |
| 09  | [Polish, docs, deploy](phase-09-polish-docs-deploy.md)             | ⬜ todo |

## Key dependencies

- 02 needs 01 (tooling). 03 unblocks 04/06 (data). 05 unblocks 06 (UI). 06 unblocks 07/08 (features). 09 last.
- MSW handlers (02/03) mirror Supabase contract so tests + static demo run without network.

## References

- [database-schema.md](database-schema.md) — full single-tenant schema + RLS
- [code-standards.md](code-standards.md) — conventions, patterns, review checklist
