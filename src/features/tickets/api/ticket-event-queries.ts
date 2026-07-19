import { queryOptions, useQuery } from '@tanstack/react-query';

import { ticketEventApi } from '~/features/tickets/api/ticket-event-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

export const ticketEventQueries = {
  list: (ticketId: string) =>
    queryOptions({
      queryKey: ticketKeys.events(ticketId),
      queryFn: () => ticketEventApi.list(ticketId),
    }),
};

// `enabled` (default on) so the read-only customer view can skip pulling the internal audit
// trail into the client — the activity feed it feeds is hidden there anyway.
export const useTicketEvents = (ticketId: string, enabled = true) =>
  useQuery({ ...ticketEventQueries.list(ticketId), enabled });
