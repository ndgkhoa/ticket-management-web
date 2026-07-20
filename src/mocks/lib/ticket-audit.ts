import { useAuthStore } from '~/stores/auth';
import { ticketEventStore } from '~/mocks/stores/ticket-event-store';
import type { TicketEventType, TicketMessageRow, TicketRow } from '~/mocks/fixtures/row-types';

function currentActor(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

function emit(
  ticketId: string,
  actorId: string | null,
  eventType: TicketEventType,
  meta: Record<string, unknown>
): void {
  ticketEventStore.insert({
    id: crypto.randomUUID(),
    ticket_id: ticketId,
    actor_id: actorId,
    event_type: eventType,
    meta,
    created_at: new Date().toISOString(),
  });
}

export function emitTicketCreatedEvents(ticket: TicketRow): void {
  const actor = currentActor();
  emit(ticket.id, actor ?? ticket.requester_id, 'created', { channel: ticket.channel });
  if (ticket.assignee_id) {
    emit(ticket.id, actor ?? ticket.assignee_id, 'assigned', {
      assignee_id: ticket.assignee_id,
      team_id: ticket.team_id,
    });
  }
}

export function emitTicketChangeEvents(patch: Partial<TicketRow>, current: TicketRow): void {
  const actor = currentActor();
  const changed = <K extends keyof TicketRow>(key: K) =>
    patch[key] !== undefined && patch[key] !== current[key];

  if (changed('status'))
    emit(current.id, actor, 'status_changed', { from: current.status, to: patch.status });
  if (changed('priority'))
    emit(current.id, actor, 'priority_changed', { from: current.priority, to: patch.priority });
  if (changed('assignee_id'))
    emit(current.id, actor, 'assigned', { from: current.assignee_id, to: patch.assignee_id });
  if (changed('team_id'))
    emit(current.id, actor, 'team_changed', { from: current.team_id, to: patch.team_id });
  if (changed('category_id'))
    emit(current.id, actor, 'category_changed', {
      from: current.category_id,
      to: patch.category_id,
    });
}

export function emitCommentEvent(message: TicketMessageRow): void {
  emit(message.ticket_id, message.author_id, 'commented', { type: message.type });
}

export function emitTagEvent(ticketId: string, tagId: string, added: boolean): void {
  emit(ticketId, currentActor(), 'tagged', { tag_id: tagId, added });
}
