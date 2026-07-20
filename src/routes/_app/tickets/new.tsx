import { createFileRoute } from '@tanstack/react-router';

import TicketCreate from '~/features/tickets/pages/ticket-create';

export const Route = createFileRoute('/_app/tickets/new')({
  component: TicketCreate,
});
