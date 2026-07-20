import { createFileRoute } from '@tanstack/react-router';

import { ticketQueries } from '~/features/tickets/api/ticket-queries';
import TicketDetail from '~/features/tickets/pages/ticket-detail';

export const Route = createFileRoute('/_app/tickets/$ticketId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(ticketQueries.detail(params.ticketId)),
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { ticketId } = Route.useParams();
  return <TicketDetail key={ticketId} />;
}
