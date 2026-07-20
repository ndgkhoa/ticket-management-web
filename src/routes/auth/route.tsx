import { createFileRoute } from '@tanstack/react-router';

import { AuthLayout } from '~/components/layouts';
import { redirectIfAuthenticated } from '~/lib/route-guards';

export const Route = createFileRoute('/auth')({
  beforeLoad: redirectIfAuthenticated,
  component: AuthLayout,
});
