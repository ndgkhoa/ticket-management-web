import { createFileRoute } from '@tanstack/react-router';

import Tickets from '~/features/tickets/pages/tickets';

/**
 * `/tickets` — the ticket list. Typed search params, the loader and `loaderDeps` are
 * layered on in the ticket-route stage; this establishes the route and page.
 */
export const Route = createFileRoute('/_app/tickets/')({
  component: Tickets,
});
