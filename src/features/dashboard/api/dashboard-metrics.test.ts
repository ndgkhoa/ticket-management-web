import { describe, expect, it } from 'vitest';

import { dashboardApi } from '~/features/dashboard/api/dashboard-api';

/**
 * Dashboard metrics over MSW — the mock aggregations mirror the Postgres RPCs. A fixed `from`
 * over the seeded corpus makes the numbers deterministic, so this checks shape + invariants
 * (totals agree across cuts, agents ranked by resolved) rather than the live SQL, which is
 * verified separately.
 */
const FROM = '2026-01-01T00:00:00.000Z';

describe('dashboard metrics over MSW', () => {
  it('returns KPI headline numbers', async () => {
    const kpis = await dashboardApi.kpis(FROM);

    expect(kpis.openCount).toBeGreaterThan(0);
    expect(kpis.avgResolutionMins).toBeGreaterThan(0);
    // Compliance is a percentage or null (no resolved tickets in window).
    if (kpis.slaCompliancePct !== null) {
      expect(kpis.slaCompliancePct).toBeGreaterThanOrEqual(0);
      expect(kpis.slaCompliancePct).toBeLessThanOrEqual(100);
    }
  });

  it('returns a gap-filled daily volume series', async () => {
    const volume = await dashboardApi.volume(FROM);

    expect(volume.length).toBeGreaterThan(0);
    for (const point of volume) {
      expect(point.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(point.created).toBeGreaterThanOrEqual(0);
      expect(point.resolved).toBeGreaterThanOrEqual(0);
    }
  });

  it('agrees on the total across status and priority cuts', async () => {
    const status = await dashboardApi.statusDistribution(FROM);
    const priority = await dashboardApi.priorityDistribution(FROM);

    const statusTotal = status.reduce((sum, slice) => sum + slice.count, 0);
    const priorityTotal = priority.reduce((sum, slice) => sum + slice.count, 0);
    expect(statusTotal).toBe(priorityTotal);
    expect(statusTotal).toBeGreaterThan(0);
    // Every status label is a real ticket status.
    for (const slice of status) {
      expect(['open', 'pending', 'on_hold', 'solved', 'closed']).toContain(slice.label);
    }
  });

  it('ranks categories busiest-first', async () => {
    const category = await dashboardApi.categoryDistribution(FROM);

    const counts = category.map((slice) => slice.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('ranks agents by resolved count, with per-agent totals', async () => {
    const agents = await dashboardApi.agentPerformance(FROM);

    expect(agents.length).toBeGreaterThan(0);
    const resolved = agents.map((row) => row.resolved);
    expect([...resolved].sort((a, b) => b - a)).toEqual(resolved);
    for (const row of agents) {
      expect(row.resolved).toBeLessThanOrEqual(row.assigned);
    }
  });
});
