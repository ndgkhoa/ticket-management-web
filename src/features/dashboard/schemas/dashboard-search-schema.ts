import { z } from 'zod';

export const DASHBOARD_RANGES = [7, 30, 90] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const DEFAULT_RANGE: DashboardRange = 30;

export const dashboardSearchSchema = z.object({
  range: z.coerce
    .number()
    .transform((value) =>
      DASHBOARD_RANGES.includes(value as DashboardRange) ? (value as DashboardRange) : DEFAULT_RANGE
    )
    .catch(DEFAULT_RANGE)
    .default(DEFAULT_RANGE),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
