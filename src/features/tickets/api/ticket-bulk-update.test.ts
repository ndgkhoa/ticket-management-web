import { describe, expect, it } from 'vitest';

import { agentUsers, ticketRows } from '~/mocks/fixtures';
import { ticketApi } from '~/features/tickets/api/ticket-api';

describe('ticketApi.bulkUpdate over MSW', () => {
  const agentId = agentUsers[0].id;

  it('updates exactly the ids passed (page-scoped selection)', async () => {
    const ids = ticketRows.slice(0, 3).map((row) => row.id);

    const count = await ticketApi.bulkUpdate({ id: ids }, { status: 'closed' });

    expect(count).toBe(3);
    for (const id of ids) {
      const ticket = await ticketApi.detail(id);
      expect(ticket.status).toBe('closed');
    }
  });

  it('updates every ticket matching a filter (select-all-matching)', async () => {
    const openCount = ticketRows.filter((row) => row.status === 'open').length;

    const count = await ticketApi.bulkUpdate({ status: ['open'] }, { assigneeId: agentId });

    expect(count).toBe(openCount);
    const sample = ticketRows.find((row) => row.status === 'open')!;
    const ticket = await ticketApi.detail(sample.id);
    expect(ticket.assigneeId).toBe(agentId);
  });

  it('unassigns when the assignee sentinel is empty', async () => {
    const assigned = ticketRows.find((row) => row.assignee_id !== null)!;

    const count = await ticketApi.bulkUpdate({ id: [assigned.id] }, { assigneeId: null });

    expect(count).toBe(1);
    const ticket = await ticketApi.detail(assigned.id);
    expect(ticket.assigneeId).toBeNull();
  });

  it('is a no-op when the patch changes nothing', async () => {
    const target = ticketRows[0];

    const count = await ticketApi.bulkUpdate({ id: [target.id] }, {});

    expect(count).toBe(0);
    const ticket = await ticketApi.detail(target.id);
    expect(ticket.status).toBe(target.status);
  });

  it('scopes a triage bulk update to unassigned + unteamed tickets only', async () => {
    const triageCount = ticketRows.filter(
      (row) => row.assignee_id === null && row.team_id === null
    ).length;
    const owned = ticketRows.find((row) => row.assignee_id !== null || row.team_id !== null)!;

    const count = await ticketApi.bulkUpdate({ triage: 'true' }, { status: 'closed' });

    expect(count).toBe(triageCount);
    const untouched = await ticketApi.detail(owned.id);
    expect(untouched.status).toBe(owned.status);
  });

  it('stamps resolved_at when bulk-solving (same as the single-solve trigger)', async () => {
    const targets = ticketRows
      .filter((row) => row.status !== 'solved' && row.resolved_at === null)
      .slice(0, 3);
    const ids = targets.map((row) => row.id);

    await ticketApi.bulkUpdate({ id: ids }, { status: 'solved' });

    for (const id of ids) {
      const ticket = await ticketApi.detail(id);
      expect(ticket.status).toBe('solved');
      expect(ticket.resolvedAt).not.toBeNull();
    }
  });
});
