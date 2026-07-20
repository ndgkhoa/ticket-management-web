import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnyRouter } from '@tanstack/react-router';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

import { ThemeProvider } from '~/components/theme-provider';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });

type RenderConfig = Omit<RenderOptions, 'wrapper'> & {
  routerEntries?: string[];
};

export const renderWithProviders = async (
  ui: ReactElement,
  { routerEntries, ...options }: RenderConfig = {}
) => {
  const queryClient = createTestQueryClient();

  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: routerEntries ?? ['/'] }),
    context: { queryClient },
  });

  await router.load();

  const result = rtlRender(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {}
        <RouterProvider router={router as unknown as AnyRouter} />
      </QueryClientProvider>
    </ThemeProvider>,
    options
  );

  return {
    user: userEvent.setup(),
    queryClient,
    ...result,
  };
};

export * from '@testing-library/react';
export { renderWithProviders as render };
