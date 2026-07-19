import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { ticketMessageApi } from '~/features/tickets/api/ticket-message-api';
import { ticketEventApi } from '~/features/tickets/api/ticket-event-api';
import { ticketTagApi } from '~/features/tickets/api/ticket-tag-api';
import { agentUsers, customerUsers, tagRows, teamRows, ticketRows } from '~/mocks/fixtures';

const USER_ID = ticketRows[0].requester_id;
const AGENT_ID = agentUsers[0].id;
const CUSTOMER_ID = customerUsers[0].id;

const asUser = (id: string) => useAuthStore.setState({ user: { id } as User });

/**
 * Ticket write paths over MSW: create, single-field update, the conversation, and the audit
 * trail. Events are no longer written by the client — the tickets/messages/tags write handlers
 * emit them (the mock twin of the database triggers), and the events handler is read-only.
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

  it('emits one audit event per changed field on update (not written by the client)', async () => {
    const target = ticketRows.find((row) => row.status !== 'on_hold' && row.priority !== 'urgent')!;

    await ticketApi.update(target.id, { status: 'on_hold', priority: 'urgent' });

    const events = await ticketEventApi.list(target.id);
    const types = events.map((event) => event.eventType);
    expect(types).toContain('status_changed');
    expect(types).toContain('priority_changed');
    // Newest-first: the change we just made leads the feed and carries the acting user.
    expect(events[0]?.actorId).toBe(USER_ID);
  });

  it('emits a team_changed event when a ticket is routed to a team', async () => {
    const newTeam = teamRows[0].id;
    const target = ticketRows.find((row) => row.team_id !== newTeam)!;

    await ticketApi.update(target.id, { teamId: newTeam });

    const events = await ticketEventApi.list(target.id);
    expect(events[0]?.eventType).toBe('team_changed');
    expect(events[0]?.meta.to).toBe(newTeam);
  });

  it('emits a commented event on a message, attributed to its author', async () => {
    const target = ticketRows[1];

    await ticketMessageApi.create({
      ticketId: target.id,
      type: 'public_reply',
      body: '<p>hi</p>',
    });

    const events = await ticketEventApi.list(target.id);
    expect(events[0]?.eventType).toBe('commented');
    expect(events[0]?.actorId).toBe(USER_ID);
  });

  it('emits both commented and status_changed when a customer reopens a solved ticket', async () => {
    asUser(CUSTOMER_ID);
    const ticket = await ticketApi.create({
      subject: 'Reopen me',
      description: 'x',
      priority: 'normal',
      categoryId: null,
    });
    await ticketApi.update(ticket.id, { status: 'solved' });

    // The requester replies — the message reopens the ticket (Phase 03) and, live, the reopen's
    // status update fires the audit trigger. The mock must produce the same pair.
    await ticketMessageApi.create({
      ticketId: ticket.id,
      type: 'public_reply',
      body: '<p>still broken</p>',
    });

    const reread = await ticketApi.detail(ticket.id);
    expect(reread.status).toBe('open');
    const types = (await ticketEventApi.list(ticket.id)).map((event) => event.eventType);
    expect(types).toContain('commented');
    expect(types).toContain('status_changed');
  });

  it('emits a tagged event when a tag is added', async () => {
    const target = ticketRows[2];
    const tagId = tagRows[0].id;

    await ticketTagApi.add(target.id, tagId);

    const events = await ticketEventApi.list(target.id);
    expect(events[0]?.eventType).toBe('tagged');
    expect(events[0]?.meta.tag_id).toBe(tagId);
    expect(events[0]?.meta.added).toBe(true);
  });
});

/**
 * SLA stamping — the MSW mirror of the database triggers. A ticket's SLA columns are set by
 * the event that causes them (create, first agent reply, solve), never by the client.
 */
describe('SLA timestamp stamping over MSW', () => {
  afterEach(() => useAuthStore.setState({ user: null }));

  it('stamps due_at and sla_policy_id from priority on create', async () => {
    asUser(CUSTOMER_ID);
    const ticket = await ticketApi.create({
      subject: 'Billing question',
      description: 'x',
      priority: 'high',
      categoryId: null,
    });

    expect(ticket.dueAt).not.toBeNull();
    expect(ticket.slaPolicyId).not.toBeNull();
    expect(ticket.firstResponseAt).toBeNull();
    expect(ticket.resolvedAt).toBeNull();
  });

  it('stamps first_response_at once, on the first agent public reply', async () => {
    asUser(CUSTOMER_ID);
    const ticket = await ticketApi.create({
      subject: 'Need help',
      description: 'x',
      priority: 'normal',
      categoryId: null,
    });
    expect(ticket.firstResponseAt).toBeNull();

    asUser(AGENT_ID);
    await ticketMessageApi.create({
      ticketId: ticket.id,
      type: 'public_reply',
      body: '<p>On it</p>',
    });
    const afterFirst = await ticketApi.detail(ticket.id);
    expect(afterFirst.firstResponseAt).not.toBeNull();

    // A later reply must not move the first-response stamp.
    await ticketMessageApi.create({
      ticketId: ticket.id,
      type: 'public_reply',
      body: '<p>Update</p>',
    });
    const afterSecond = await ticketApi.detail(ticket.id);
    expect(afterSecond.firstResponseAt).toBe(afterFirst.firstResponseAt);
  });

  it('does NOT stamp first_response_at on a customer reply', async () => {
    asUser(CUSTOMER_ID);
    const ticket = await ticketApi.create({
      subject: 'Question',
      description: 'x',
      priority: 'low',
      categoryId: null,
    });
    await ticketMessageApi.create({
      ticketId: ticket.id,
      type: 'public_reply',
      body: '<p>hello</p>',
    });

    const after = await ticketApi.detail(ticket.id);
    expect(after.firstResponseAt).toBeNull();
  });

  it('stamps resolved_at when a ticket is solved', async () => {
    asUser(AGENT_ID);
    const ticket = await ticketApi.create({
      subject: 'Solve me',
      description: 'x',
      priority: 'normal',
      categoryId: null,
    });
    expect(ticket.resolvedAt).toBeNull();

    const solved = await ticketApi.update(ticket.id, { status: 'solved' });
    expect(solved.resolvedAt).not.toBeNull();
  });
});
