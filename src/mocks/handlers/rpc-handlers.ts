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

/**
 * PostgREST `rpc/*` endpoints — the Postgres functions the app calls with
 * `supabase.rpc(...)`, mocked so `VITE_API_MODE=msw` answers them too.
 *
 * Each mirrors a SQL function in the migrations; the migration is the source of truth
 * and this reproduces its result over the fixtures. Kept apart from the table handlers
 * because an RPC is a POST to `rpc/<name>` with a JSON arg body, not a table verb.
 */

/**
 * `assignable_agents()` → profiles that can be assigned a ticket, name-ordered. Mirrors the
 * SQL exactly — `has_permission(p.id, 'ticket.update')` — by resolving the same junctions
 * over the fixtures (permission → roles granting it → users holding those roles), rather
 * than a hand-picked `agentUsers` list that would silently omit e.g. owner and diverge from
 * live. Strip the seed-only password so it never rides the wire.
 */
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

/**
 * `bulk_update_tickets(p_filters, p_patch)` → apply a status/assignee change to every
 * ticket matching the filter, and return the affected count. The list's filter object is
 * passed straight through (page-scoped selection sends `{ id: [...] }`; select-all-matching
 * sends the active filters), so the mutated set is exactly what the list would show.
 *
 * The matching set is computed with the same `applyListQuery` the read path uses — with an
 * unbounded page size so it returns every match — which keeps the mock in step with the
 * list by construction. Tag filters resolve through the junction first, mirroring the api.
 */
const bulkUpdateTickets = http.post('*/rest/v1/rpc/bulk_update_tickets', async ({ request }) => {
  const { p_filters = {}, p_patch = {} } = (await request.json().catch(() => ({}))) as BulkArgs;

  // A patch that changes nothing is a no-op — never touch rows (mirrors the SQL guard).
  if (p_patch.status === undefined && p_patch.assignee_id === undefined) {
    return HttpResponse.json(0);
  }

  const filters: ListParams['filters'] = {};
  for (const [key, value] of Object.entries(p_filters)) {
    // `tag_id` resolves through the junction below; `triage` is not a column — it maps to
    // is-null constraints (mirrors the read path + the SQL triage branch).
    if (key !== 'tag_id' && key !== 'triage') filters[key] = value;
  }
  if (p_filters.triage) {
    filters.assignee_id = FILTER_IS_NULL;
    filters.team_id = FILTER_IS_NULL;
  }

  // Resolve tags → ticket ids exactly as the list api does; an empty match means nothing.
  if (p_filters.tag_id?.length) {
    const wanted = new Set(p_filters.tag_id);
    const ticketIds = [
      ...new Set(ticketTagRows.filter((row) => wanted.has(row.tag_id)).map((row) => row.ticket_id)),
    ];
    if (ticketIds.length === 0) return HttpResponse.json(0);
    filters.id = ticketIds;
  }

  const rows = ticketStore.all();
  // An unbounded page so every match is returned, not just the first page. The applier
  // only uses pageSize to slice, so an off-allowlist size is fine here — cast past the
  // schema's PageSize union, which exists to guard URLs, not this internal call.
  const params = { page: 1, pageSize: Math.max(rows.length, 1), filters } as ListParams;
  const { rows: matched } = applyListQuery(rows, params, ticketListConfig);

  const patch: Record<string, string | null> = {};
  if (p_patch.status !== undefined) patch.status = p_patch.status;
  if (p_patch.assignee_id !== undefined) {
    patch.assignee_id = p_patch.assignee_id === '' ? null : p_patch.assignee_id;
  }

  // Route each row through the same update stamp the single-ticket PATCH uses, so the bulk
  // path inherits resolved_at-on-solve, reopen (due_at + pause reset) and pause accumulation
  // identically — no duplicated subset to drift (mirrors the live trigger firing on the UPDATE).
  // Then emit the audit events for the change, exactly as the single PATCH does.
  for (const row of matched) {
    const stamped = stampTicketSlaOnUpdate(patch as Partial<TicketRow>, row);
    ticketStore.update(row.id, stamped as never);
    emitTicketChangeEvents(patch as Partial<TicketRow>, row);
  }
  return HttpResponse.json(matched.length);
});

export const rpcHandlers = [assignableAgents, bulkUpdateTickets];
