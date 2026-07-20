export const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: (range: number) => [...dashboardKeys.all, 'kpis', range] as const,
  volume: (range: number) => [...dashboardKeys.all, 'volume', range] as const,
  statusDistribution: (range: number) => [...dashboardKeys.all, 'status', range] as const,
  priorityDistribution: (range: number) => [...dashboardKeys.all, 'priority', range] as const,
  categoryDistribution: (range: number) => [...dashboardKeys.all, 'category', range] as const,
  agentPerformance: (range: number) => [...dashboardKeys.all, 'agents', range] as const,
};
