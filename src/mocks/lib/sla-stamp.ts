import {
  permissionRows,
  rolePermissionRows,
  slaPolicyIdByPriority,
  slaPolicyRows,
  userRoleRows,
} from '~/mocks/fixtures';
import { ticketStore } from '~/mocks/stores/ticket-store';
import type { TicketMessageRow, TicketRow } from '~/mocks/fixtures/row-types';

const resolutionMinsByPriority = new Map(
  slaPolicyRows.map((policy) => [policy.priority, policy.resolution_mins])
);

const ticketUpdatePermissionId = permissionRows.find((row) => row.code === 'ticket.update')?.id;
const rolesWithTicketUpdate = new Set(
  rolePermissionRows
    .filter((row) => row.permission_id === ticketUpdatePermissionId)
    .map((row) => row.role_id)
);
const agentUserIds = new Set(
  userRoleRows.filter((row) => rolesWithTicketUpdate.has(row.role_id)).map((row) => row.user_id)
);

function dueAtFor(priority: TicketRow['priority'], createdAt: string): string | null {
  const mins = resolutionMinsByPriority.get(priority);
  if (mins === undefined) return null;
  return new Date(new Date(createdAt).getTime() + mins * 60_000).toISOString();
}

export function dueFromNow(priority: TicketRow['priority']): string | null {
  const mins = resolutionMinsByPriority.get(priority);
  if (mins === undefined) return null;
  return new Date(Date.now() + mins * 60_000).toISOString();
}

const ACTIVE_STATUSES: TicketRow['status'][] = ['open', 'pending', 'on_hold'];

const isPaused = (status: TicketRow['status']) => status === 'pending' || status === 'on_hold';

export function accumulatePauseOnUpdate(
  patch: Partial<TicketRow>,
  current: TicketRow
): Partial<TicketRow> {
  if (patch.status === undefined || patch.status === current.status) return {};
  const wasPaused = isPaused(current.status);
  const willPause = isPaused(patch.status);

  if (!wasPaused && willPause) return { sla_paused_at: new Date().toISOString() };
  if (wasPaused && !willPause) {
    const banked = current.sla_paused_at
      ? current.sla_paused_ms + (Date.now() - new Date(current.sla_paused_at).getTime())
      : current.sla_paused_ms;
    return { sla_paused_ms: banked, sla_paused_at: null };
  }
  return {};
}

export function stampTicketSlaOnInsert(row: TicketRow): TicketRow {
  const createdAt = new Date(
    Math.min(new Date(row.created_at).getTime(), Date.now())
  ).toISOString();
  return {
    ...row,
    created_at: createdAt,
    sla_policy_id: slaPolicyIdByPriority.get(row.priority) ?? null,
    due_at: dueAtFor(row.priority, createdAt),
    first_response_at: row.first_response_at ?? null,
    resolved_at: row.resolved_at ?? null,
    sla_paused_at: isPaused(row.status) ? createdAt : (row.sla_paused_at ?? null),
    sla_paused_ms: row.sla_paused_ms ?? 0,
  };
}

export function stampTicketSlaOnUpdate(
  patch: Partial<TicketRow>,
  current: TicketRow
): Partial<TicketRow> {
  const next: Partial<TicketRow> = { ...patch };

  if (patch.status === 'solved' && current.status !== 'solved' && !current.resolved_at) {
    next.resolved_at = new Date().toISOString();
  }

  if (patch.priority && patch.priority !== current.priority && !current.resolved_at) {
    next.sla_policy_id = slaPolicyIdByPriority.get(patch.priority) ?? null;
    next.due_at = dueAtFor(patch.priority, current.created_at);
  }

  if (current.status === 'solved' && patch.status && ACTIVE_STATUSES.includes(patch.status)) {
    next.due_at = dueFromNow(patch.priority ?? current.priority);
    next.sla_paused_ms = 0;
  }

  return { ...next, ...accumulatePauseOnUpdate(patch, current) };
}

export function stampFirstResponseOnMessage(message: TicketMessageRow): void {
  if (message.type !== 'public_reply') return;
  if (!message.author_id || !agentUserIds.has(message.author_id)) return;

  const ticket = ticketStore.all().find((row) => row.id === message.ticket_id);
  if (ticket && !ticket.first_response_at) {
    const now = new Date().toISOString();
    ticketStore.update(ticket.id, { first_response_at: now, updated_at: now });
  }
}
