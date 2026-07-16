import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { ticketQueries } from '~/features/tickets/api/ticket-queries';
import {
  TICKET_SEARCH_DEFAULTS,
  ticketSearchSchema,
  toTicketListParams,
} from '~/features/tickets/schemas/ticket-search-schema';
import Tickets from '~/features/tickets/pages/tickets';

/**
 * `/tickets` — the ticket list, its state living entirely in the URL.
 *
 * `loaderDeps` returns the search so the loader re-runs when any param changes;
 * without it the loader caches the first page and pagination silently never
 * refetches. `stripSearchParams` keeps default values out of the URL, so the landing
 * page is a clean `/tickets` rather than `/tickets?page=1&sort=created_at&dir=desc`.
 */
export const Route = createFileRoute('/_app/tickets/')({
  validateSearch: ticketSearchSchema,
  search: { middlewares: [stripSearchParams(TICKET_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(ticketQueries.list(toTicketListParams(deps))),
  component: Tickets,
});
