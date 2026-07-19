import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ticketTagApi } from '~/features/tickets/api/ticket-tag-api';
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
 * Toggle one tag on a ticket (add when `next` is true, remove otherwise), then refresh the
 * ticket's tags and activity feed. The `tagged` event is emitted by a database trigger on the
 * junction insert/delete, not written here.
 */
export const useToggleTicketTag = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, next }: { tagId: string; next: boolean }) => {
      if (next) await ticketTagApi.add(ticketId, tagId);
      else await ticketTagApi.remove(ticketId, tagId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.tags(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.events(ticketId) });
    },
  });
};
