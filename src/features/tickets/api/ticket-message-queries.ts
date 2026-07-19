import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ticketMessageApi,
  type CreateMessageInput,
} from '~/features/tickets/api/ticket-message-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

export const ticketMessageQueries = {
  list: (ticketId: string) =>
    queryOptions({
      queryKey: ticketKeys.messages(ticketId),
      queryFn: () => ticketMessageApi.list(ticketId),
    }),
};

export const useTicketMessages = (ticketId: string) =>
  useQuery(ticketMessageQueries.list(ticketId));

/**
 * Post a reply or internal note. The `commented` event is emitted by a database trigger on the
 * message insert, not written here. Invalidates the ticket's messages and events so the
 * timeline and activity feed both refresh.
 */
export const useCreateMessage = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessageInput) => ticketMessageApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.messages(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.events(ticketId) });
      // A first agent public reply stamps the ticket's first_response_at (Phase 01 trigger),
      // so refetch the ticket itself — otherwise the SLA card only updates on a reload.
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId), exact: true });
    },
  });
};
