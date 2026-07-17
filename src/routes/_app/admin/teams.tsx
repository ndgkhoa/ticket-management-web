import { createFileRoute } from '@tanstack/react-router';

import Teams from '~/features/admin/teams/pages/teams';

/** `/admin/teams` — CRUD for support teams (guarded by the admin layout). */
export const Route = createFileRoute('/_app/admin/teams')({
  component: Teams,
});
