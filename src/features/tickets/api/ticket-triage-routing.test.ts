import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { categoryRows, customerUsers } from '~/mocks/fixtures';
import type { ListParams } from '~/lib/list-query';

const CUSTOMER_ID = customerUsers[0].id;

/**
 * Auto-routing + the triage queue (Phase 02), mirrored in MSW. A new ticket routes to its
 * category's default team; a ticket with no default stays unteamed and surfaces in the triage
 * filter (unassigned AND unteamed).
 */
describe('ticket triage + auto-routing over MSW', () => {
  beforeEach(() => useAuthStore.setState({ user: { id: CUSTOMER_ID } as User }));
  afterEach(() => useAuthStore.setState({ user: null }));

  it('auto-routes a new ticket to its category default team', async () => {
    const category = categoryRows.find((row) => row.default_team_id !== null)!;

    const ticket = await ticketApi.create({
      subject: 'Charged twice',
      description: 'x',
      priority: 'normal',
      categoryId: category.id,
    });

    expect(ticket.teamId).toBe(category.default_team_id);
  });

  it('leaves a category-less ticket unteamed and shows it in the triage queue', async () => {
    const ticket = await ticketApi.create({
      subject: 'Triage me',
      description: 'x',
      priority: 'normal',
      categoryId: null,
    });
    expect(ticket.teamId).toBeNull();
    expect(ticket.assigneeId).toBeNull();

    const { rows } = await ticketApi.list({
      page: 1,
      pageSize: 100,
      filters: { triage: 'true' },
    } as ListParams);

    expect(rows.some((row) => row.id === ticket.id)).toBe(true);
    // The triage queue is exactly the unassigned + unteamed set.
    expect(rows.every((row) => row.assigneeId === null && row.teamId === null)).toBe(true);
  });
});
