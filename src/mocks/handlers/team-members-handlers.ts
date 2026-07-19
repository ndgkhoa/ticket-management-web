import { http } from 'msw';

import { parsePostgrestRequest } from '~/mocks/lib/postgrest-request';
import { collectionResponse } from '~/mocks/lib/postgrest-response';
import { teamMemberId, teamMemberStore } from '~/mocks/stores/team-members-store';

/**
 * `team_members` handlers — a dedicated set because the table has a composite (team_id,
 * user_id) key and no `id`, so the generic `makeTableHandler` (which reads/deletes by `id`)
 * can't serve it. Backs the admin members dialog: list a team's members, add one, remove one.
 */
const path = '*/rest/v1/team_members';

const list = http.get(path, ({ request }) => {
  const { filters } = parsePostgrestRequest(request);
  const teamId = filters.team_id?.value;
  const userId = filters.user_id?.value;
  const rows = teamMemberStore
    .all()
    .filter(
      (row) =>
        (teamId === undefined || row.team_id === teamId) &&
        (userId === undefined || row.user_id === userId)
    );
  return collectionResponse(rows);
});

const add = http.post(path, async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as { team_id: string; user_id: string };
  const row = { ...body, id: teamMemberId(body.team_id, body.user_id) };
  const inserted = teamMemberStore.insert(row);
  return collectionResponse([inserted]);
});

const remove = http.delete(path, ({ request }) => {
  const { filters } = parsePostgrestRequest(request);
  const teamId = filters.team_id?.value;
  const userId = filters.user_id?.value;
  const removed =
    teamId && userId ? teamMemberStore.remove(teamMemberId(teamId, userId)) : undefined;
  return collectionResponse(removed ? [removed] : []);
});

export const teamMembersHandlers = [list, add, remove];
