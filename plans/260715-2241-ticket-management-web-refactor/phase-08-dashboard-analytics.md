# Phase 08 — Dashboard Analytics

**Priority:** P2 · **Status:** ⬜ todo · **Depends:** Phase 06

## Overview

A metrics dashboard that makes the demo look like a real operational tool: ticket volume trends, SLA compliance, agent performance, status/priority distribution. Charts via Recharts (or Tremor).

## Requirements

- KPI cards: open tickets, avg first-response time, avg resolution time, SLA compliance %.
- Charts: ticket volume over time (line/area), status distribution (donut), priority breakdown (bar), agent performance (bar/table), tickets by category (bar).
- Date-range filter (typed search param) + role scoping (agent sees own/team; admin sees all).
- Data via Postgres aggregation (SQL views / RPC) — not client-side crunching; keeps it realistic + fast.
- MSW returns aggregated fixtures for demo/tests.

## Related code files

- Create: `src/features/dashboard/**` (rebuilt) per the standard taxonomy — `api/` (RPC calls + their query hooks), `components/charts/**`, `schemas/`, `pages/`; `supabase/migrations/*_analytics_views.sql` (aggregation views/RPC).
- Modify: dashboard route + nav.

## Implementation steps

1. Design SQL aggregation views/RPCs (volume, SLA, agent perf, distributions) with role scoping via RLS.
2. Build query hooks (queryOptions) for each metric.
3. Build KPI cards + chart components (reusable, themed to design system, dark-mode aware).
4. Date-range filter wired to typed search params.
5. MSW aggregated fixtures; tests for render + empty states.
6. a11y: charts have text/table fallback + labels.

## Todo

- [ ] Aggregation SQL views/RPCs (role-scoped)
- [ ] Metric query hooks
- [ ] KPI cards + chart components (themed, dark-mode)
- [ ] Date-range filter (typed search params)
- [ ] MSW fixtures + tests
- [ ] a11y fallbacks for charts

## Success criteria

Dashboard renders accurate role-scoped metrics; charts responsive + themed; works on MSW demo.

## Risks

- Aggregation performance — index supporting columns; precompute where needed.
- Chart a11y — provide non-visual equivalents.

## Audit notes (2026-07-19)

Dashboard is greenfield — only a stub `features/dashboard/pages` + route `_app/index.tsx`. Concrete gaps to cover when cooking:

- **No chart library installed** — add Recharts or Tremor (neither is in `package.json`).
- **No analytics RPC or MSW handlers yet** — the aggregation RPCs need new MSW handlers (current mocks only cover `assignable_agents`, `bulk_update_tickets`, `match_tickets`, `similar_tickets`) plus aggregated fixtures.
- Seed already has a rich 500-ticket corpus with SLA stamps, `resolved_at`/`first_response_at`, priorities, teams, categories — the views can compute real metrics off it; **no new seed data needed**.
