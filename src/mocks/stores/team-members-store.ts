import { teamMemberRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

export const teamMemberStore = createTableStore(
  teamMemberRows.map((row) => ({ ...row, id: `${row.team_id}:${row.user_id}` }))
);

export const teamMemberId = (teamId: string, userId: string) => `${teamId}:${userId}`;
