import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { http, HttpResponse } from 'msw';
import { render as rtlRender } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';

import { ThemeProvider } from '~/components/theme-provider';
import { screen, waitFor } from '~/testing/render';
import { server } from '~/mocks/server';
import { useAuthStore } from '~/stores/auth';
import { ticketQueries } from '~/features/tickets/api/ticket-queries';
import { ticketRows } from '~/mocks/fixtures';
import TicketDetail from '~/features/tickets/pages/ticket-detail';

vi.mock('~/features/tickets/hooks/use-ticket-detail-realtime', () => ({
  useTicketDetailRealtime: () => [],
}));

const target = ticketRows.find((row) => row.assignee_id && row.team_id)!;

async function renderDetailAs(permissions: string[]) {
  useAuthStore.setState({
    user: { id: target.requester_id } as User,
    permissions: new Set(permissions),
    status: 'authenticated',
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()();
  const appRoute = createRoute({ getParentRoute: () => rootRoute, id: '_app' });
  const ticketRoute = createRoute({
    getParentRoute: () => appRoute,
    path: 'tickets/$ticketId',
    loader: ({ context, params }) =>
      context.queryClient.ensureQueryData(ticketQueries.detail(params.ticketId)),
    component: () => <TicketDetail />,
  });
  const routeTree = rootRoute.addChildren([appRoute.addChildren([ticketRoute])]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/tickets/${target.id}`] }),
    context: { queryClient },
  });
  await router.load();

  rtlRender(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router as unknown as AnyRouter} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

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
