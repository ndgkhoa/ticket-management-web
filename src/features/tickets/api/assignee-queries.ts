import { queryOptions, useQuery } from '@tanstack/react-query';

import { assigneeApi } from '~/features/tickets/api/assignee-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

/**
 * Assignable-agents query — the assignee filter's options. Long `staleTime`: the agent
 * roster changes rarely, and re-fetching it on every list revisit is waste, so it stays
 * warm for the session.
 */
export const assigneeQueries = {
  list: () =>
    queryOptions({
      queryKey: ticketKeys.assignees(),
      queryFn: () => assigneeApi.list(),
      staleTime: 5 * 60 * 1000,
    }),
};

export const useAssigneeOptions = (options?: { enabled?: boolean }) =>
  useQuery({ ...assigneeQueries.list(), enabled: options?.enabled ?? true });
