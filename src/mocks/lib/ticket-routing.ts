import { categoryRows } from '~/mocks/fixtures';
import type { TicketRow } from '~/mocks/fixtures/row-types';

/**
 * MSW mirror of the `route_ticket_on_create` trigger: fill a ticket's team_id from its
 * category's default team when the caller did not choose a team. Only sets team_id when
 * null, so an explicit team is never overridden.
 */
const defaultTeamByCategory = new Map(categoryRows.map((row) => [row.id, row.default_team_id]));

export function routeTicketOnInsert(row: TicketRow): TicketRow {
  if (row.team_id == null && row.category_id != null) {
    return { ...row, team_id: defaultTeamByCategory.get(row.category_id) ?? null };
  }
  return row;
}
