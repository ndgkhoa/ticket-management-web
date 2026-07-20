import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { ticketQueries } from '~/features/tickets/api/ticket-queries';
import {
  TICKET_SEARCH_DEFAULTS,
  ticketSearchSchema,
  toTicketListParams,
} from '~/features/tickets/schemas/ticket-search-schema';
import Tickets from '~/features/tickets/pages/tickets';

export const Route = createFileRoute('/_app/tickets/')({
  validateSearch: ticketSearchSchema,
  search: { middlewares: [stripSearchParams(TICKET_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(ticketQueries.list(toTicketListParams(deps))),
  component: Tickets,
});
