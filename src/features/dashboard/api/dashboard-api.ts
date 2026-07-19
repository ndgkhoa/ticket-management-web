import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  agentPerformanceSchema,
  dashboardKpisSchema,
  parseDistribution,
  volumePointSchema,
} from '~/features/dashboard/schemas/dashboard-schema';

/**
 * The dashboard metric RPCs. Each is a role-scoped Postgres aggregation (see the
 * `analytics_views` migration); the client only passes the window start and validates the shape.
 * `p_from` is an ISO timestamp — the start of the selected 7/30/90-day range.
 */
export const dashboardApi = {
  kpis: async (from: string) => {
    const { data } = await supabase.rpc('dashboard_kpis', { p_from: from }).throwOnError();
    // A table-returning function yields a one-row array even over an empty window.
    return dashboardKpisSchema.parse(data?.[0]);
  },

  volume: async (from: string) => {
    const { data } = await supabase.rpc('dashboard_volume', { p_from: from }).throwOnError();
    return z.array(volumePointSchema).parse(data);
  },

  statusDistribution: async (from: string) => {
    const { data } = await supabase
      .rpc('dashboard_status_distribution', { p_from: from })
      .throwOnError();
    return parseDistribution(data, 'status');
  },

  priorityDistribution: async (from: string) => {
    const { data } = await supabase
      .rpc('dashboard_priority_distribution', { p_from: from })
      .throwOnError();
    return parseDistribution(data, 'priority');
  },

  categoryDistribution: async (from: string) => {
    const { data } = await supabase
      .rpc('dashboard_category_distribution', { p_from: from })
      .throwOnError();
    return parseDistribution(data, 'category');
  },

  agentPerformance: async (from: string) => {
    const { data } = await supabase
      .rpc('dashboard_agent_performance', { p_from: from })
      .throwOnError();
    return z.array(agentPerformanceSchema).parse(data);
  },
};
