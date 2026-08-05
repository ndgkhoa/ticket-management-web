import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoute } from '@tanstack/react-router';
import type * as Recharts from 'recharts';

import { dashboardSearchSchema } from '~/features/dashboard/schemas/dashboard-search-schema';
import Dashboard from '~/features/dashboard/pages/dashboard';
import { renderAppRoute, screen } from '~/testing/render';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>{children}</div>
    ),
  };
});

const renderDashboard = () =>
  renderAppRoute(
    (parent) =>
      createRoute({
        getParentRoute: () => parent,
        path: '/',
        validateSearch: dashboardSearchSchema,
        component: () => <Dashboard />,
      }),
    '/?range=30'
  );

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
