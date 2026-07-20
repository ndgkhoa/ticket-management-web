import { createFileRoute } from '@tanstack/react-router';

import { teamListQuery } from '~/features/admin/teams/api/team-queries';
import Teams from '~/features/admin/teams/pages/teams';

export const Route = createFileRoute('/_app/admin/teams')({
  loader: ({ context }) => context.queryClient.ensureQueryData(teamListQuery()),
  component: Teams,
});
