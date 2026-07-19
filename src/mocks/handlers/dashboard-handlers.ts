import { http, HttpResponse } from 'msw';

import { categoryRows, userRows } from '~/mocks/fixtures';
import { ticketStore } from '~/mocks/stores/ticket-store';
import type { TicketRow } from '~/mocks/fixtures/row-types';

/**
 * MSW mirror of the dashboard analytics RPCs (`analytics_views` migration). The live functions
 * aggregate in Postgres, scoped by RLS; there's no RLS in the demo, so these compute over the
 * whole ticket store — the same numbers an admin (who sees everything) gets live. Kept beside the
 * SQL it mirrors so the two can't drift.
 */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const OPEN_STATUSES = ['open', 'pending', 'on_hold'];
const STATUS_ORDER = ['open', 'pending', 'on_hold', 'solved', 'closed'];
const PRIORITY_ORDER = ['low', 'normal', 'high', 'urgent'];

const nameById = new Map(userRows.map((user) => [user.id, user.full_name]));
const categoryNameById = new Map(categoryRows.map((row) => [row.id, row.name]));

async function windowStart(request: Request): Promise<number> {
  const { p_from } = (await request.json().catch(() => ({}))) as { p_from?: string };
  return p_from ? new Date(p_from).getTime() : 0;
}

const createdSince = (from: number): TicketRow[] =>
  ticketStore.all().filter((row) => new Date(row.created_at).getTime() >= from);

const elapsedMins = (from: string, to: string) =>
  (new Date(to).getTime() - new Date(from).getTime()) / MIN;

const avgOrNull = (nums: number[]): number | null =>
  nums.length ? Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length) : null;

const dashboardKpis = http.post('*/rest/v1/rpc/dashboard_kpis', async ({ request }) => {
  const rows = createdSince(await windowStart(request));
  const resolved = rows.filter((row) => row.resolved_at);
  // Only tickets that had a resolution target count toward compliance (mirrors the SQL).
  const withTarget = resolved.filter((row) => row.due_at);
  const met = withTarget.filter(
    (row) => new Date(row.resolved_at!).getTime() <= new Date(row.due_at!).getTime()
  ).length;
  return HttpResponse.json([
    {
      // Current open backlog, not window-scoped (mirrors the SQL subquery).
      open_count: ticketStore.all().filter((row) => OPEN_STATUSES.includes(row.status)).length,
      avg_first_response_mins: avgOrNull(
        rows
          .filter((row) => row.first_response_at)
          .map((row) => elapsedMins(row.created_at, row.first_response_at!))
      ),
      avg_resolution_mins: avgOrNull(
        resolved.map((row) => elapsedMins(row.created_at, row.resolved_at!))
      ),
      sla_compliance_pct: withTarget.length
        ? Math.round((1000 * met) / withTarget.length) / 10
        : null,
    },
  ]);
});

const dashboardVolume = http.post('*/rest/v1/rpc/dashboard_volume', async ({ request }) => {
  const from = await windowStart(request);
  const dayKey = (iso: string) => iso.slice(0, 10);
  const created = new Map<string, number>();
  const resolved = new Map<string, number>();
  for (const row of ticketStore.all()) {
    if (new Date(row.created_at).getTime() >= from) {
      created.set(dayKey(row.created_at), (created.get(dayKey(row.created_at)) ?? 0) + 1);
    }
    if (row.resolved_at && new Date(row.resolved_at).getTime() >= from) {
      resolved.set(dayKey(row.resolved_at), (resolved.get(dayKey(row.resolved_at)) ?? 0) + 1);
    }
  }
  const out: { day: string; created_count: number; resolved_count: number }[] = [];
  for (let day = from - (from % DAY); day <= Date.now(); day += DAY) {
    const key = new Date(day).toISOString().slice(0, 10);
    out.push({
      day: key,
      created_count: created.get(key) ?? 0,
      resolved_count: resolved.get(key) ?? 0,
    });
  }
  return HttpResponse.json(out);
});

function distribution(
  path: string,
  keyOf: (row: TicketRow) => string,
  labelKey: string,
  order: string[] | 'count-desc'
) {
  return http.post(`*/rest/v1/rpc/${path}`, async ({ request }) => {
    const counts = new Map<string, number>();
    for (const row of createdSince(await windowStart(request))) {
      const key = keyOf(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = [...counts];
    entries.sort(
      order === 'count-desc'
        ? (a, b) => b[1] - a[1]
        : (a, b) => order.indexOf(a[0]) - order.indexOf(b[0])
    );
    return HttpResponse.json(entries.map(([label, count]) => ({ [labelKey]: label, count })));
  });
}

const dashboardStatus = distribution(
  'dashboard_status_distribution',
  (row) => row.status,
  'status',
  STATUS_ORDER
);
const dashboardPriority = distribution(
  'dashboard_priority_distribution',
  (row) => row.priority,
  'priority',
  PRIORITY_ORDER
);
const dashboardCategory = distribution(
  'dashboard_category_distribution',
  (row) =>
    row.category_id ? (categoryNameById.get(row.category_id) ?? 'Uncategorized') : 'Uncategorized',
  'category',
  'count-desc'
);

const dashboardAgents = http.post(
  '*/rest/v1/rpc/dashboard_agent_performance',
  async ({ request }) => {
    const byAgent = new Map<string, { assigned: number; resolved: number; resMins: number[] }>();
    for (const row of createdSince(await windowStart(request))) {
      if (!row.assignee_id) continue;
      const agent = nameById.get(row.assignee_id) ?? '—';
      const stat = byAgent.get(agent) ?? { assigned: 0, resolved: 0, resMins: [] };
      stat.assigned += 1;
      if (row.resolved_at) {
        stat.resolved += 1;
        stat.resMins.push(elapsedMins(row.created_at, row.resolved_at));
      }
      byAgent.set(agent, stat);
    }
    const out = [...byAgent]
      .map(([agent, stat]) => ({
        agent,
        assigned_count: stat.assigned,
        resolved_count: stat.resolved,
        avg_resolution_mins: avgOrNull(stat.resMins),
      }))
      .sort((a, b) => b.resolved_count - a.resolved_count);
    return HttpResponse.json(out);
  }
);

export const dashboardHandlers = [
  dashboardKpis,
  dashboardVolume,
  dashboardStatus,
  dashboardPriority,
  dashboardCategory,
  dashboardAgents,
];
