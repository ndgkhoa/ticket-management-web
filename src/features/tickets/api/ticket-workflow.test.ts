import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { ticketMessageApi } from '~/features/tickets/api/ticket-message-api';
import { ticketEventApi } from '~/features/tickets/api/ticket-event-api';
import { ticketRows } from '~/mocks/fixtures';

const USER_ID = ticketRows[0].requester_id;

/**
 * Ticket write paths over MSW: create, single-field update, and the conversation/audit
 * inserts — against the writable tickets/messages/events handlers on the shared store.
 */
describe('ticket workflow over MSW', () => {
  beforeEach(() => useAuthStore.setState({ user: { id: USER_ID } as User }));
  afterEach(() => useAuthStore.setState({ user: null }));

  it('creates a ticket as the current user', async () => {
    const ticket = await ticketApi.create({
      subject: 'Cannot log in',
      description: 'It fails',
      priority: 'high',
      categoryId: null,
    });

    expect(ticket.subject).toBe('Cannot log in');
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('high');
    expect(ticket.requesterId).toBe(USER_ID);
  });

  it('updates a single field and reflects it on re-read', async () => {
    const target = ticketRows[0];

    const updated = await ticketApi.update(target.id, { status: 'solved' });
    expect(updated.status).toBe('solved');

    const reread = await ticketApi.detail(target.id);
    expect(reread.status).toBe('solved');
  });

  it('posts a message and lists it on the ticket', async () => {
    const target = ticketRows[0];

    const message = await ticketMessageApi.create({
      ticketId: target.id,
      type: 'internal_note',
      body: '<p>Checking the logs</p>',
    });
    expect(message.type).toBe('internal_note');

    const messages = await ticketMessageApi.list(target.id);
    expect(messages.some((row) => row.id === message.id)).toBe(true);
  });

  it('records an event and lists it newest-first', async () => {
    const target = ticketRows[0];

    await ticketEventApi.create({
      ticketId: target.id,
      eventType: 'status_changed',
      meta: { to: 'solved' },
    });

    const events = await ticketEventApi.list(target.id);
    expect(events[0]?.eventType).toBe('status_changed');
    expect(events[0]?.meta.to).toBe('solved');
  });
});
