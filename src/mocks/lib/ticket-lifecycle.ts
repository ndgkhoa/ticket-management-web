import { ticketStore } from '~/mocks/stores/ticket-store';
import { dueFromNow } from '~/mocks/lib/sla-stamp';
import { emitTicketChangeEvents } from '~/mocks/lib/ticket-audit';
import type { TicketMessageRow } from '~/mocks/fixtures/row-types';

export function reopenOnCustomerReply(message: TicketMessageRow): void {
  if (message.type !== 'public_reply') return;

  const ticket = ticketStore.all().find((row) => row.id === message.ticket_id);
  if (ticket && ticket.status === 'solved' && ticket.requester_id === message.author_id) {
    ticketStore.update(ticket.id, {
      status: 'open',
      resolved_at: null,
      due_at: dueFromNow(ticket.priority),
      sla_paused_ms: 0,
      updated_at: new Date().toISOString(),
    });
    emitTicketChangeEvents({ status: 'open' }, ticket);
  }
}
