import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ticketTagApi } from '~/features/tickets/api/ticket-tag-api';
import { ticketEventApi } from '~/features/tickets/api/ticket-event-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

export const ticketTagQueries = {
  list: (ticketId: string) =>
    queryOptions({
      queryKey: ticketKeys.tags(ticketId),
      queryFn: () => ticketTagApi.list(ticketId),
    }),
};

export const useTicketTags = (ticketId: string) => useQuery(ticketTagQueries.list(ticketId));

/**
 * Toggle one tag on a ticket (add when `next` is true, remove otherwise), record the
 * `tagged` event, and refresh the ticket's tags and activity feed.
 */
export const useToggleTicketTag = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, next }: { tagId: string; next: boolean }) => {
      if (next) await ticketTagApi.add(ticketId, tagId);
      else await ticketTagApi.remove(ticketId, tagId);
      await ticketEventApi.create({ ticketId, eventType: 'tagged', meta: { tagId, added: next } });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.tags(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.events(ticketId) });
    },
  });
};
