import { createCrudQueries } from '~/features/admin/shared/use-crud-queries';
import { teamApi, type TeamInput } from '~/features/admin/teams/api/team-api';
import { teamKeys } from '~/features/admin/teams/constants/team-keys';
import type { Team } from '~/features/admin/teams/schemas/team-schema';

export const {
  listQuery: teamListQuery,
  useList: useTeamList,
  useCreate: useTeamCreate,
  useUpdate: useTeamUpdate,
  useRemove: useTeamRemove,
} = createCrudQueries<Team, TeamInput>({ keys: teamKeys, api: teamApi });
