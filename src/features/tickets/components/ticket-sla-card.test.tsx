import { describe, expect, it } from 'vitest';

import '~/i18n';
import { render, screen } from '~/testing/render';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';
import { TicketSlaCard } from '~/features/tickets/components/ticket-sla-card';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function makeTicket(overrides: Partial<Ticket>): Ticket {
  const now = Date.now();
  return {
    id: '00000000-0000-4000-8000-000000000001',
    priority: 'high',
    status: 'open',
    createdAt: new Date(now - HOUR).toISOString(),
    dueAt: new Date(now + 4 * HOUR).toISOString(),
    firstResponseAt: null,
    resolvedAt: null,
    slaPausedAt: null,
    slaPausedMs: 0,
    ...overrides,
  } as unknown as Ticket;
}

describe('TicketSlaCard', () => {
  it('marks both targets met when responded and resolved within deadline', async () => {
    const now = Date.now();
    await render(
      <TicketSlaCard
        ticket={makeTicket({
          createdAt: new Date(now - 30 * MIN).toISOString(),
          firstResponseAt: new Date(now - 20 * MIN).toISOString(),
          dueAt: new Date(now + 4 * HOUR).toISOString(),
          resolvedAt: new Date(now - 10 * MIN).toISOString(),
        })}
      />
    );

    expect(await screen.findAllByText('Met')).toHaveLength(2);
  });

  it('marks both targets breached when overdue and unmet', async () => {
    const now = Date.now();
    await render(
      <TicketSlaCard
        ticket={makeTicket({
          createdAt: new Date(now - 10 * HOUR).toISOString(),
          dueAt: new Date(now - HOUR).toISOString(),
        })}
      />
    );

    expect(await screen.findAllByText('Breached')).toHaveLength(2);
  });

  it('credits paused time so a resolve past the deadline still reads met', async () => {
    const now = Date.now();
    await render(
      <TicketSlaCard
        ticket={makeTicket({
          createdAt: new Date(now - 5 * HOUR).toISOString(),
          firstResponseAt: new Date(now - 5 * HOUR + 10 * MIN).toISOString(),
          dueAt: new Date(now - HOUR).toISOString(),
          resolvedAt: new Date(now).toISOString(),
          slaPausedMs: 2 * HOUR,
        })}
      />
    );

    expect(await screen.findAllByText('Met')).toHaveLength(2);
  });
});
