import { teamMemberRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

/**
 * The mutable team-membership store, so the admin members dialog can add/remove agents and
 * the next read sees it. `team_members` has a composite (team_id, user_id) key and no `id`;
 * `createTableStore` keys by `id`, so a synthetic id is seeded from the pair. Only this mock
 * uses the synthetic id — the real table has none.
 */
export const teamMemberStore = createTableStore(
  teamMemberRows.map((row) => ({ ...row, id: `${row.team_id}:${row.user_id}` }))
);

/** The synthetic id for a (team, user) pair — how the mock addresses a membership row. */
export const teamMemberId = (teamId: string, userId: string) => `${teamId}:${userId}`;
