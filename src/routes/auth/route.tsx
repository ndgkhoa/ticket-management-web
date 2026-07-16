import { createFileRoute } from '@tanstack/react-router';

import { AuthLayout } from '~/components/layouts';
import { redirectIfAuthenticated } from '~/lib/route-guards';

/** `/auth/*` — sign-in and friends. Signed-in users are bounced to the app. */
export const Route = createFileRoute('/auth')({
  beforeLoad: redirectIfAuthenticated,
  component: AuthLayout,
});
