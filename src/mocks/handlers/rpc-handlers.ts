import { http, HttpResponse } from 'msw';

import {
  permissionRows,
  rolePermissionRows,
  ticketTagRows,
  userRoleRows,
  userRows,
} from '~/mocks/fixtures';
import { FILTER_IS_NULL, type ListParams } from '~/lib/list-query';
import type { TicketRow } from '~/mocks/fixtures/row-types';
import { stampTicketSlaOnUpdate } from '~/mocks/lib/sla-stamp';
import { emitTicketChangeEvents } from '~/mocks/lib/ticket-audit';
import { applyListQuery } from '~/mocks/lib/apply-list-query';
import { ticketListConfig } from '~/mocks/config/ticket-list-config';
import { ticketStore } from '~/mocks/stores/ticket-store';
import { collectionResponse } from '~/mocks/lib/postgrest-response';

const ticketUpdatePermissionId = permissionRows.find((row) => row.code === 'ticket.update')?.id;
const roleIdsWithTicketUpdate = new Set(
  rolePermissionRows
    .filter((row) => row.permission_id === ticketUpdatePermissionId)
    .map((row) => row.role_id)
);
const assignableUserIds = new Set(
  userRoleRows.filter((row) => roleIdsWithTicketUpdate.has(row.role_id)).map((row) => row.user_id)
);

const assignableAgents = http.post('*/rest/v1/rpc/assignable_agents', () => {
  const rows = userRows
    .filter((user) => assignableUserIds.has(user.id))
    .map(({ password: _password, ...profile }) => profile)
    .sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));
  return collectionResponse(rows);
});

type BulkArgs = {
  p_filters?: Record<string, string[]>;
  p_patch?: { status?: string; assignee_id?: string };
};

const bulkUpdateTickets = http.post('*/rest/v1/rpc/bulk_update_tickets', async ({ request }) => {
  const { p_filters = {}, p_patch = {} } = (await request.json().catch(() => ({}))) as BulkArgs;

  if (p_patch.status === undefined && p_patch.assignee_id === undefined) {
    return HttpResponse.json(0);
  }

  const filters: ListParams['filters'] = {};
  for (const [key, value] of Object.entries(p_filters)) {
    if (key !== 'tag_id' && key !== 'triage') filters[key] = value;
  }
  if (p_filters.triage) {
    filters.assignee_id = FILTER_IS_NULL;
    filters.team_id = FILTER_IS_NULL;
  }

  if (p_filters.tag_id?.length) {
    const wanted = new Set(p_filters.tag_id);
    const ticketIds = [
      ...new Set(ticketTagRows.filter((row) => wanted.has(row.tag_id)).map((row) => row.ticket_id)),
    ];
    if (ticketIds.length === 0) return HttpResponse.json(0);
    filters.id = ticketIds;
  }

  const rows = ticketStore.all();
  const params = { page: 1, pageSize: Math.max(rows.length, 1), filters } as ListParams;
  const { rows: matched } = applyListQuery(rows, params, ticketListConfig);

  const patch: Record<string, string | null> = {};
  if (p_patch.status !== undefined) patch.status = p_patch.status;
  if (p_patch.assignee_id !== undefined) {
    patch.assignee_id = p_patch.assignee_id === '' ? null : p_patch.assignee_id;
  }

  for (const row of matched) {
    const stamped = stampTicketSlaOnUpdate(patch as Partial<TicketRow>, row);
    ticketStore.update(row.id, stamped as never);
    emitTicketChangeEvents(patch as Partial<TicketRow>, row);
  }
  return HttpResponse.json(matched.length);
});

export const rpcHandlers = [assignableAgents, bulkUpdateTickets];
