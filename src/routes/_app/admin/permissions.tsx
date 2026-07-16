import { createFileRoute } from '@tanstack/react-router';

import Permissions from '~/features/admin/permissions/pages/permissions';

/** `/admin/permissions` — read-only catalogue (RBAC guard added in the guards stage). */
export const Route = createFileRoute('/_app/admin/permissions')({
  component: Permissions,
});
