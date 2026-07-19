import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';

import type { ListParams } from '~/lib/list-query';
import {
  ticketApi,
  type BulkTicketPatch,
  type CreateTicketInput,
  type UpdateTicketPatch,
} from '~/features/tickets/api/ticket-api';
import { embedTicketInBackground } from '~/features/tickets/api/embed-ticket';
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

/**
 * Create a ticket. The `created` event is emitted by a database trigger, not written here.
 * Returns the new ticket so the caller can navigate to its detail page.
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const ticket = await ticketApi.create(input);
      // Best-effort semantic embedding so the new ticket is searchable and can surface as
      // a "similar ticket". Not awaited — it must never delay or fail the create itself.
      embedTicketInBackground(ticket.id);
      return ticket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
  });
};

/**
 * A single-ticket field change from the detail workflow. The matching event
 * (status_changed, assigned, team_changed, …) is emitted by a database trigger on the update,
 * so the mutation only invalidates the ticket's detail (which cascades to its messages/events/
 * tags) and every list.
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: UpdateTicketPatch }) =>
      ticketApi.update(args.id, args.patch),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.id) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    },
  });
};

/**
 * Bulk status/assignee mutation. On success it invalidates every ticket list so the
 * affected rows re-read from the server — never splices, since a bulk change can move
 * rows onto or off the current filtered page, which only a refetch resolves correctly.
 */
export const useBulkUpdateTickets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filters, patch }: { filters: ListParams['filters']; patch: BulkTicketPatch }) =>
      ticketApi.bulkUpdate(filters, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
  });
};
