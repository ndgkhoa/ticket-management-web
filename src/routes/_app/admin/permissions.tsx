import { createFileRoute } from '@tanstack/react-router';

import { permissionQueries } from '~/features/admin/permissions/api/permission-queries';
import Permissions from '~/features/admin/permissions/pages/permissions';

/** `/admin/permissions` — read-only catalogue. The loader warms the list so the table
 *  renders with data, not a loading skeleton. */
export const Route = createFileRoute('/_app/admin/permissions')({
  loader: ({ context }) => context.queryClient.ensureQueryData(permissionQueries.list()),
  component: Permissions,
});
