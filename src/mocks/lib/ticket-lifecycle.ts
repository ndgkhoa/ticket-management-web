import { ticketStore } from '~/mocks/stores/ticket-store';
import { dueFromNow } from '~/mocks/lib/sla-stamp';
import type { TicketMessageRow } from '~/mocks/fixtures/row-types';

/**
 * MSW mirror of the `reopen_on_customer_reply` trigger: a public reply from the ticket's own
 * requester reopens a solved ticket and clears resolved_at. Only `solved` reopens — `closed`
 * is terminal — and only the requester (not an agent) triggers it. Auto-close has no MSW twin
 * (it is a scheduled DB job); the demo won't auto-close, and it is tested at the SQL level.
 */
export function reopenOnCustomerReply(message: TicketMessageRow): void {
  if (message.type !== 'public_reply') return;

  const ticket = ticketStore.all().find((row) => row.id === message.ticket_id);
  if (ticket && ticket.status === 'solved' && ticket.requester_id === message.author_id) {
    ticketStore.update(ticket.id, {
      status: 'open',
      resolved_at: null,
      // Reopen grants a fresh resolution window and a fresh pause budget (mirrors
      // stamp_ticket_sla's reopen branch).
      due_at: dueFromNow(ticket.priority),
      sla_paused_ms: 0,
      updated_at: new Date().toISOString(),
    });
  }
}
