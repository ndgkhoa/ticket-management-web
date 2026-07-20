import { afterEach, describe, expect, it, vi } from 'vitest';
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
import type * as Recharts from 'recharts';

import '~/i18n';
import { ThemeProvider } from '~/components/theme-provider';
import { screen } from '~/testing/render';
import { dashboardSearchSchema } from '~/features/dashboard/schemas/dashboard-search-schema';
import Dashboard from '~/features/dashboard/pages/dashboard';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

async function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()();
  const appRoute = createRoute({ getParentRoute: () => rootRoute, id: '_app' });
  const indexRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/',
    validateSearch: dashboardSearchSchema,
    component: () => <Dashboard />,
  });
  const routeTree = rootRoute.addChildren([appRoute.addChildren([indexRoute])]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/?range=30'] }),
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

describe('Dashboard', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders KPI cards, the range toggle, and the agent table from live metrics', async () => {
    await renderDashboard();

    expect(await screen.findByText('Open tickets')).toBeInTheDocument();
    expect(screen.getByText('SLA compliance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days', pressed: true })).toBeInTheDocument();

    expect(await screen.findByRole('columnheader', { name: 'Agent' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Ticket volume' })).toBeInTheDocument();
  });
});
