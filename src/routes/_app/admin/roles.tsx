import { createFileRoute } from '@tanstack/react-router';

import { roleListQuery } from '~/features/admin/roles/api/role-queries';
import Roles from '~/features/admin/roles/pages/roles';

/** `/admin/roles` — role CRUD + permission matrix. The loader warms the list so the table
 *  renders with data, not a loading skeleton. */
export const Route = createFileRoute('/_app/admin/roles')({
  loader: ({ context }) => context.queryClient.ensureQueryData(roleListQuery()),
  component: Roles,
});
