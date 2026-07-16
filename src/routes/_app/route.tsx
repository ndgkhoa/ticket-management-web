import { createFileRoute } from '@tanstack/react-router';

import { MainLayout } from '~/components/layouts';
import { requireAuth } from '~/lib/route-guards';

/**
 * Pathless layout for the authenticated area — dashboard, admin, tickets all sit
 * under it. The auth guard runs once here rather than being repeated on every child
 * route, and `MainLayout` renders the shell (sidebar, navbar) around the `<Outlet>`.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => requireAuth(location.pathname),
  component: MainLayout,
});
