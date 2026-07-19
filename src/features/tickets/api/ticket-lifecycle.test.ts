import { afterEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { ticketMessageApi } from '~/features/tickets/api/ticket-message-api';
import { agentUsers, customerUsers } from '~/mocks/fixtures';

const CUSTOMER = customerUsers[0].id;
const AGENT = agentUsers[0].id;
const asUser = (id: string) => useAuthStore.setState({ user: { id } as User });

async function solvedTicketOwnedByCustomer(): Promise<string> {
  asUser(CUSTOMER);
  const ticket = await ticketApi.create({
    subject: 'Reopen me',
    description: 'x',
    priority: 'normal',
    categoryId: null,
  });
  const solved = await ticketApi.update(ticket.id, { status: 'solved' });
  expect(solved.resolvedAt).not.toBeNull();
  return ticket.id;
}

/**
 * Reopen lifecycle (Phase 03), mirrored in MSW. A customer public reply reopens a solved
 * ticket and clears resolved_at; an agent reply does not; a closed ticket stays closed.
 * (Auto-close is a scheduled DB job with no MSW twin — verified at the SQL level.)
 */
describe('ticket reopen lifecycle over MSW', () => {
  afterEach(() => useAuthStore.setState({ user: null }));

  it('reopens a solved ticket on a customer public reply and clears resolved_at', async () => {
    const id = await solvedTicketOwnedByCustomer();

    asUser(CUSTOMER);
    await ticketMessageApi.create({
      ticketId: id,
      type: 'public_reply',
      body: '<p>still broken</p>',
    });

    const ticket = await ticketApi.detail(id);
    expect(ticket.status).toBe('open');
    expect(ticket.resolvedAt).toBeNull();
    // Reopen restarts the resolution SLA — a fresh due date in the future.
    expect(ticket.dueAt).not.toBeNull();
    expect(new Date(ticket.dueAt!).getTime()).toBeGreaterThan(Date.now());
  });

  it('does NOT reopen when an agent replies to a solved ticket', async () => {
    const id = await solvedTicketOwnedByCustomer();

    asUser(AGENT);
    await ticketMessageApi.create({
      ticketId: id,
      type: 'public_reply',
      body: '<p>looking into it</p>',
    });

    const ticket = await ticketApi.detail(id);
    expect(ticket.status).toBe('solved');
  });

  it('does NOT reopen a closed ticket on a customer reply', async () => {
    asUser(CUSTOMER);
    const created = await ticketApi.create({
      subject: 'Closed one',
      description: 'x',
      priority: 'normal',
      categoryId: null,
    });
    await ticketApi.update(created.id, { status: 'closed' });

    await ticketMessageApi.create({
      ticketId: created.id,
      type: 'public_reply',
      body: '<p>hi</p>',
    });

    const ticket = await ticketApi.detail(created.id);
    expect(ticket.status).toBe('closed');
  });
});
