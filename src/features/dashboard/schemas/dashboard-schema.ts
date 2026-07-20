import { z } from 'zod';

export const dashboardKpisSchema = z
  .object({
    open_count: z.coerce.number(),
    avg_first_response_mins: z.coerce.number().nullable(),
    avg_resolution_mins: z.coerce.number().nullable(),
    sla_compliance_pct: z.coerce.number().nullable(),
  })
  .transform((row) => ({
    openCount: row.open_count,
    avgFirstResponseMins: row.avg_first_response_mins,
    avgResolutionMins: row.avg_resolution_mins,
    slaCompliancePct: row.sla_compliance_pct,
  }));

export type DashboardKpis = z.infer<typeof dashboardKpisSchema>;

export const volumePointSchema = z
  .object({
    day: z.string(),
    created_count: z.coerce.number(),
    resolved_count: z.coerce.number(),
  })
  .transform((row) => ({
    day: row.day,
    created: row.created_count,
    resolved: row.resolved_count,
  }));

export type VolumePoint = z.infer<typeof volumePointSchema>;

export const distributionSliceSchema = z
  .object({ label: z.string(), count: z.coerce.number() })
  .transform((row) => ({ label: row.label, count: row.count }));

export type DistributionSlice = z.infer<typeof distributionSliceSchema>;

export const parseDistribution = (rows: unknown, labelKey: string): DistributionSlice[] =>
  z
    .array(
      z
        .object({ count: z.coerce.number() })
        .passthrough()
        .transform((row) => ({ label: String(row[labelKey] ?? ''), count: row.count }))
    )
    .parse(rows);

export const agentPerformanceSchema = z
  .object({
    agent: z.string(),
    assigned_count: z.coerce.number(),
    resolved_count: z.coerce.number(),
    avg_resolution_mins: z.coerce.number().nullable(),
  })
  .transform((row) => ({
    agent: row.agent,
    assigned: row.assigned_count,
    resolved: row.resolved_count,
    avgResolutionMins: row.avg_resolution_mins,
  }));

export type AgentPerformance = z.infer<typeof agentPerformanceSchema>;
