import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '~/lib/route-guards';

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: () => requirePermission('user.manage'),
});
