import { z } from 'zod';

/** The dashboard's time window presets, in days. */
export const DASHBOARD_RANGES = [7, 30, 90] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const DEFAULT_RANGE: DashboardRange = 30;

/**
 * URL-as-truth for the dashboard: a single `range` param (7/30/90 days). Anything else falls back
 * to 30, so a hand-edited or stale URL can never render an invalid window.
 */
export const dashboardSearchSchema = z.object({
  // `.default()` makes `range` optional for callers (a bare `<Link to="/">` needs no search),
  // while `.catch()` + the clamp guarantee the resolved value is always one of 7/30/90.
  range: z.coerce
    .number()
    .transform((value) =>
      DASHBOARD_RANGES.includes(value as DashboardRange) ? (value as DashboardRange) : DEFAULT_RANGE
    )
    .catch(DEFAULT_RANGE)
    .default(DEFAULT_RANGE),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
