import { createFileRoute } from '@tanstack/react-router';

import { teamListQuery } from '~/features/admin/teams/api/team-queries';
import Teams from '~/features/admin/teams/pages/teams';

/** `/admin/teams` — CRUD for support teams (guarded by the admin layout). The loader warms
 *  the list so the table renders with data, not a loading skeleton. */
export const Route = createFileRoute('/_app/admin/teams')({
  loader: ({ context }) => context.queryClient.ensureQueryData(teamListQuery()),
  component: Teams,
});
