import { createFileRoute } from '@tanstack/react-router';

import Users from '~/features/admin/users/pages/users';

/** `/admin/users` — read-only profile list (RBAC guard added in the guards stage). */
export const Route = createFileRoute('/_app/admin/users')({
  component: Users,
});
