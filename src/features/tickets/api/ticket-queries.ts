import { keepPreviousData, queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';

import type { ListParams } from '~/lib/list-query';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

/**
 * queryOptions factories, shared by the hooks and by route loaders
 * (`ensureQueryData`) so data is warm before the page renders.
 *
 * The list keeps the previous page on screen while the next loads — `keepPreviousData`
 * is set here, per query, rather than globally, because it only makes sense for a
 * paginated list. The detail uses suspense: a single resource has no "previous" to
 * hold, and the route boundary renders its fallback.
 */
export const ticketQueries = {
  list: (params: ListParams) =>
    queryOptions({
      queryKey: ticketKeys.list(params),
      queryFn: () => ticketApi.list(params),
      placeholderData: keepPreviousData,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: ticketKeys.detail(id),
      queryFn: () => ticketApi.detail(id),
    }),
};

export const useTicketList = (params: ListParams) => useQuery(ticketQueries.list(params));

export const useTicketDetail = (id: string) => useSuspenseQuery(ticketQueries.detail(id));
