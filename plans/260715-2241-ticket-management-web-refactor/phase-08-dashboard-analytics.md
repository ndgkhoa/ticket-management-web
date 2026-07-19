# Phase 08 — Dashboard Analytics

**Priority:** P2 · **Status:** ✅ done · **Depends:** Phase 06

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

- [x] Aggregation SQL RPCs, role-scoped (`20260719090000_analytics_views.sql`): `dashboard_kpis`, `dashboard_volume`, `dashboard_{status,priority,category}_distribution`, `dashboard_agent_performance`. All `security invoker` + read `public.tickets` → the `tickets_select` RLS policy scopes each to the caller (verified live: admin 500 vs agent 313). Range-windowed by `p_from`; granted to `authenticated` only.
- [x] Metric query hooks — `dashboard-api` + `dashboard-queries` (X-api + X-queries convention), keyed by range, `p_from` derived at fetch.
- [x] KPI cards + chart components (Recharts + a shadcn-style `ui/chart` wrapper using the `--chart-1..5` tokens → themed + dark-mode). Charts: volume area, status donut, priority bar, category horizontal bar; agent performance as an accessible table.
- [x] Date-range filter — typed `?range=` search param (7/30/90), `.default()` so bare links need no search.
- [x] MSW `dashboard-handlers` mirror all 6 aggregations over the ticket store; tests: metrics parity (5), page render over MSW (1), `formatMinutes` (4) — 150 total pass.
- [x] a11y: chart cards are `role="img"` with a title label (Recharts SVG has none); agent performance is a real `<table>` (kept out of `role="img"`); charts use Recharts `accessibilityLayer`.

**Verified:** tsc clean · lint 0 err · live RPCs return sane numbers · RLS scoping (admin vs agent) · `db:reset` runs the full chain + seed cleanly. Note: the seed corpus is anchored near 2026-07-16, so the live 7/30/90-day windows only show data while "now" is close to that — inherent to fixed demo data.

**Post-review fixes:**

1. (Med) Distinct **error state** — a failed metric RPC used to render as "No data"/"—", hiding an outage. `KpiCard`/`ChartCard` now take `isError` and show `Dashboard.LoadError` separate from empty.
2. (Med) **SLA compliance denominator** excludes resolved tickets with no `due_at` (a priority without a resolution SLA), so they aren't counted as automatic breaches — SQL + MSW.
3. (Med, **design decision**) **`open_count` is the current open backlog, NOT window-scoped** — "Open tickets" is a right-now number. Verified live: 308 regardless of the range. Other three KPIs stay window-scoped.
4. (Low) Category ordering gets a name tiebreak (deterministic); volume day-bucketing documented as UTC-session-dependent (Supabase default).

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
