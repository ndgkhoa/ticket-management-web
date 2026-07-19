import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { customerUsers } from '~/mocks/fixtures';

const CUSTOMER = customerUsers[0].id;

const create = () =>
  ticketApi.create({ subject: 'Pause me', description: 'x', priority: 'normal', categoryId: null });

/**
 * SLA pause accumulator (Phase 04), mirrored in MSW. Entering pending/on_hold starts the pause;
 * leaving banks the elapsed time and clears the marker. The freeze-while-paused maths is covered
 * by the SLA card's render tests; here we assert the accumulator's state transitions.
 */
describe('SLA pause accumulator over MSW', () => {
  beforeEach(() => useAuthStore.setState({ user: { id: CUSTOMER } as User }));
  afterEach(() => useAuthStore.setState({ user: null }));

  it('leaves a never-paused ticket at zero', async () => {
    const ticket = await create();
    expect(ticket.slaPausedAt).toBeNull();
    expect(ticket.slaPausedMs).toBe(0);
  });

  it('starts the pause clock when a ticket enters pending', async () => {
    const ticket = await create();
    const paused = await ticketApi.update(ticket.id, { status: 'pending' });
    expect(paused.slaPausedAt).not.toBeNull();
    expect(paused.slaPausedMs).toBe(0);
  });

  it('banks paused time and clears the marker on resume', async () => {
    const ticket = await create();
    await ticketApi.update(ticket.id, { status: 'on_hold' });

    const resumed = await ticketApi.update(ticket.id, { status: 'open' });
    expect(resumed.slaPausedAt).toBeNull();
    expect(resumed.slaPausedMs).toBeGreaterThanOrEqual(0);
  });
});
