import { categoryRows } from '~/mocks/fixtures';
import type { TicketRow } from '~/mocks/fixtures/row-types';

const defaultTeamByCategory = new Map(categoryRows.map((row) => [row.id, row.default_team_id]));

export function routeTicketOnInsert(row: TicketRow): TicketRow {
  if (row.team_id == null && row.category_id != null) {
    return { ...row, team_id: defaultTeamByCategory.get(row.category_id) ?? null };
  }
  return row;
}
