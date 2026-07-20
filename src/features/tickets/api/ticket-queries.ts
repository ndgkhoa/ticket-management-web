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
import { embedTicketInBackground } from '~/features/tickets/api/embed-ticket-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

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

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const ticket = await ticketApi.create(input);
      embedTicketInBackground(ticket.id);
      return ticket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
  });
};

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

export const useBulkUpdateTickets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filters, patch }: { filters: ListParams['filters']; patch: BulkTicketPatch }) =>
      ticketApi.bulkUpdate(filters, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
  });
};
