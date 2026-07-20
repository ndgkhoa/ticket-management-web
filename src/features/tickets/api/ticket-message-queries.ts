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

export const useCreateMessage = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessageInput) => ticketMessageApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.messages(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.events(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId), exact: true });
    },
  });
};
