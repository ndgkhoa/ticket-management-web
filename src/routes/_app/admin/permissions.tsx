import { createFileRoute } from '@tanstack/react-router';

import { permissionQueries } from '~/features/admin/permissions/api/permission-queries';
import Permissions from '~/features/admin/permissions/pages/permissions';

export const Route = createFileRoute('/_app/admin/permissions')({
  loader: ({ context }) => context.queryClient.ensureQueryData(permissionQueries.list()),
  component: Permissions,
});
