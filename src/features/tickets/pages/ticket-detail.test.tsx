import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { http, HttpResponse } from 'msw';
import { createRoute } from '@tanstack/react-router';

import { server } from '~/mocks/server';
import { useAuthStore } from '~/stores/auth';
import { ticketQueries } from '~/features/tickets/api/ticket-queries';
import { ticketRows } from '~/mocks/fixtures';
import TicketDetail from '~/features/tickets/pages/ticket-detail';
import { renderAppRoute, screen, waitFor } from '~/testing/render';

vi.mock('~/features/tickets/hooks/use-ticket-detail-realtime', () => ({
  useTicketDetailRealtime: () => [],
}));

const target = ticketRows.find((row) => row.assignee_id && row.team_id)!;

const renderDetailAs = (permissions: string[]) => {
  useAuthStore.setState({
    user: { id: target.requester_id } as User,
    permissions: new Set(permissions),
    status: 'authenticated',
  });

  return renderAppRoute(
    (parent) =>
      createRoute({
        getParentRoute: () => parent,
        path: 'tickets/$ticketId',
        loader: ({ context, params }) =>
          context.queryClient.ensureQueryData(ticketQueries.detail(params.ticketId)),
        component: () => <TicketDetail />,
      }),
    `/tickets/${target.id}`
  );
};

function spyAgentRoster() {
  const calls = { count: 0 };
  server.use(
    http.post('*/rest/v1/rpc/assignable_agents', () => {
      calls.count += 1;
      return HttpResponse.json([]);
    })
  );
  return calls;
}

describe('TicketDetail read-only gating', () => {
  afterEach(() => useAuthStore.setState({ user: null, permissions: new Set(), status: 'loading' }));

  it('shows the agent workflow sidebar to a user with ticket.update', async () => {
    const roster = spyAgentRoster();
    await renderDetailAs(['ticket.update']);

    expect(await screen.findByText(target.subject)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Properties' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SLA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Similar tickets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Attachments' })).toBeInTheDocument();
    await waitFor(() => expect(roster.count).toBeGreaterThan(0));
  });

  it('hides the agent controls — and skips their data fetches — for a customer', async () => {
    const roster = spyAgentRoster();
    await renderDetailAs([]);

    expect(await screen.findByText(target.subject)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Attachments' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Properties' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'SLA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Activity' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Similar tickets' })).not.toBeInTheDocument();
    expect(roster.count).toBe(0);
  });
});
