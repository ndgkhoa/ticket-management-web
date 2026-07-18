import { Constants } from '~/lib/database.types';
import type { ApplyListConfig } from '~/mocks/lib/apply-list-query';
import type { TicketRow } from '~/mocks/fixtures/row-types';

/**
 * How the MSW applier reproduces the ticket list — the mock-side twin of
 * `ticketListConfig` in `ticket-api.ts`. Defined once here so the MSW handler and the
 * Supabase↔MSW parity test read the identical config; two copies would let the demo and
 * the parity guard silently disagree about sort or search.
 *
 * Enum columns sort by their Postgres DEFINITION order, not alphabetically — the single
 * most likely parity trap. The status/priority accessors map to the enum ordinal so an
 * in-memory sort agrees with `order by status` against the database.
 */
const STATUS_ORDER = Constants.public.Enums.ticket_status;
const PRIORITY_ORDER = Constants.public.Enums.ticket_priority;

export const ticketListConfig: ApplyListConfig<TicketRow> = {
  filterable: {
    status: (row) => row.status,
    priority: (row) => row.priority,
    channel: (row) => row.channel,
    assignee_id: (row) => row.assignee_id,
    team_id: (row) => row.team_id,
    category_id: (row) => row.category_id,
    // The tag filter's resolved-id constraint (`.in('id', ticketIds)`); see ticket-api.
    id: (row) => row.id,
  },
  // Subject + description feed the tsvector; subject alone feeds the trigram fallback.
  searchText: (row) => `${row.subject} ${row.description}`,
  fallbackText: (row) => row.subject,
  sortAccessors: {
    created_at: (row) => row.created_at,
    updated_at: (row) => row.updated_at,
    due_at: (row) => row.due_at,
    status: (row) => STATUS_ORDER.indexOf(row.status),
    priority: (row) => PRIORITY_ORDER.indexOf(row.priority),
    id: (row) => row.id,
  },
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};
