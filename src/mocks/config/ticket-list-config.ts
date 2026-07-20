import { Constants } from '~/lib/database.types';
import type { ApplyListConfig } from '~/mocks/lib/apply-list-query';
import type { TicketRow } from '~/mocks/fixtures/row-types';

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
    id: (row) => row.id,
  },
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
