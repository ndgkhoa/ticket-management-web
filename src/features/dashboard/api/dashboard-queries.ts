import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '~/features/dashboard/api/dashboard-api';
import { dashboardKeys } from '~/features/dashboard/constants/dashboard-keys';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 60 * 1000;

/** The window start for a range in days — derived at fetch time, so the key stays the range. */
const fromForRange = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

export const useDashboardKpis = (range: number) =>
  useQuery({
    queryKey: dashboardKeys.kpis(range),
    queryFn: () => dashboardApi.kpis(fromForRange(range)),
    staleTime: STALE_MS,
  });

export const useDashboardVolume = (range: number) =>
  useQuery({
    queryKey: dashboardKeys.volume(range),
    queryFn: () => dashboardApi.volume(fromForRange(range)),
    staleTime: STALE_MS,
  });

export const useStatusDistribution = (range: number) =>
  useQuery({
    queryKey: dashboardKeys.statusDistribution(range),
    queryFn: () => dashboardApi.statusDistribution(fromForRange(range)),
    staleTime: STALE_MS,
  });

export const usePriorityDistribution = (range: number) =>
  useQuery({
    queryKey: dashboardKeys.priorityDistribution(range),
    queryFn: () => dashboardApi.priorityDistribution(fromForRange(range)),
    staleTime: STALE_MS,
  });

export const useCategoryDistribution = (range: number) =>
  useQuery({
    queryKey: dashboardKeys.categoryDistribution(range),
    queryFn: () => dashboardApi.categoryDistribution(fromForRange(range)),
    staleTime: STALE_MS,
  });

export const useAgentPerformance = (range: number) =>
  useQuery({
    queryKey: dashboardKeys.agentPerformance(range),
    queryFn: () => dashboardApi.agentPerformance(fromForRange(range)),
    staleTime: STALE_MS,
  });
