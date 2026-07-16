import { createFileRoute } from '@tanstack/react-router';

import Roles from '~/features/admin/roles/pages/roles';

/** `/admin/roles` — read-only role list (RBAC guard added in the guards stage). */
export const Route = createFileRoute('/_app/admin/roles')({
  component: Roles,
});
