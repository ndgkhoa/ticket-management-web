import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render as rtlRender, renderHook as rtlRenderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnyRoute, AnyRouter } from '@tanstack/react-router';
import type { RenderHookOptions, RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '~/components/theme-provider';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const Providers = ({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ThemeProvider>
);

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
    <Providers queryClient={queryClient}>
      <RouterProvider router={router as unknown as AnyRouter} />
    </Providers>,
    options
  );

  return {
    user: userEvent.setup(),
    queryClient,
    ...result,
  };
};

export const renderAppRoute = async (
  buildRoute: (parent: AnyRoute) => AnyRoute,
  initialEntry: string
) => {
  const queryClient = createTestQueryClient();

  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()();
  const appRoute = createRoute({ getParentRoute: () => rootRoute, id: '_app' });
  const leafRoute = buildRoute(appRoute);

  const router = createRouter({
    routeTree: rootRoute.addChildren([appRoute.addChildren([leafRoute])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    context: { queryClient },
  });

  await router.load();

  const result = rtlRender(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router as unknown as AnyRouter} />
    </Providers>
  );

  return {
    user: userEvent.setup(),
    queryClient,
    ...result,
  };
};

export const renderHookWithProviders = <Result, Props>(
  hook: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>
) => {
  const queryClient = createTestQueryClient();

  const result = rtlRenderHook(hook, {
    ...options,
    wrapper: ({ children }) => <Providers queryClient={queryClient}>{children}</Providers>,
  });

  return {
    user: userEvent.setup(),
    queryClient,
    ...result,
  };
};

export * from '@testing-library/react';
export { renderWithProviders as render };
