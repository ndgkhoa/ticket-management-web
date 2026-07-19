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
  component: TicketDetailRoute,
});

/**
 * Keyed by ticketId so navigating between tickets (e.g. via the similar-tickets links)
 * fully remounts the page instead of reusing the instance. Reusing it carried the
 * previous ticket's local UI state over — the AI draft/summary and composer content — and
 * under the layout's Suspense boundary could even leave the old subtree on screen. A key
 * on the whole page is the one place that guarantees a clean reset per ticket.
 */
function TicketDetailRoute() {
  const { ticketId } = Route.useParams();
  return <TicketDetail key={ticketId} />;
}
