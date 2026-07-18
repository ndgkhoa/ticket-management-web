import { createFileRoute } from '@tanstack/react-router';

import { ticketQueries } from '~/features/tickets/api/ticket-queries';
import TicketDetail from '~/features/tickets/pages/ticket-detail';

/**
 * `/tickets/:id` — the ticket detail. The loader warms the ticket itself (read by the
 * suspense query on the page); its conversation, events and tags load on the page as
 * regular queries.
 */
export const Route = createFileRoute('/_app/tickets/$ticketId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ticketQueries.detail(params.ticketId)),
  component: TicketDetail,
});
