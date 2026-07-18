import { createFileRoute } from '@tanstack/react-router';

import TicketCreate from '~/features/tickets/pages/ticket-create';

/** `/tickets/new` — the create-ticket form. Static segment, so it wins over `$ticketId`. */
export const Route = createFileRoute('/_app/tickets/new')({
  component: TicketCreate,
});
