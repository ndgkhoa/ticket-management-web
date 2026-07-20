import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  agentPerformanceSchema,
  dashboardKpisSchema,
  parseDistribution,
  volumePointSchema,
} from '~/features/dashboard/schemas/dashboard-schema';

export const dashboardApi = {
  kpis: async (from: string) => {
    const { data } = await supabase.rpc('dashboard_kpis', { p_from: from }).throwOnError();
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
