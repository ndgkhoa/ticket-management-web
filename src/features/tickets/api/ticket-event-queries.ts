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

export const useTicketEvents = (ticketId: string, enabled = true) =>
  useQuery({ ...ticketEventQueries.list(ticketId), enabled });
