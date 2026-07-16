import { createFileRoute } from '@tanstack/react-router';

import Dashboard from '~/features/dashboard';

/** `/` — the dashboard. */
export const Route = createFileRoute('/_app/')({
  component: Dashboard,
});
