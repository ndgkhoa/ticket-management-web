import { createFileRoute } from '@tanstack/react-router';

import { MainLayout } from '~/components/layouts';
import { requireAuth } from '~/lib/route-guards';

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => requireAuth(location.pathname),
  component: MainLayout,
});
