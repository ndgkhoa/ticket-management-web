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

/**
 * A fresh QueryClient per render — never the app singleton from `lib/query-client`.
 *
 * The singleton would carry its cache from one test into the next, so a test could
 * pass only because an earlier one warmed the data. Retries are off because a
 * deliberate error case would otherwise burn the timeout budget retrying before it
 * ever reports.
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });

type RenderConfig = Omit<RenderOptions, 'wrapper'> & {
  /** Initial URL(s) the memory history starts at — pass to test router-dependent UI. */
  routerEntries?: string[];
};

/**
 * Renders inside the app's real providers, with a TanStack Router memory router so
 * components using router hooks (`useNavigate`, `useLocation`, `Link`) have context.
 *
 * The router is a single root route whose component is the element under test — the
 * standard way to unit-test a component in isolation without booting the whole route
 * tree. A test that needs real navigation targets renders the actual route instead.
 */
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

  // Resolve the initial match before rendering; RouterProvider is otherwise in its
  // pending state on first paint and a synchronous `getByRole` sees an empty tree.
  await router.load();

  const result = rtlRender(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {/* The ad-hoc test router isn't the registered app router, so its type
            doesn't match RouterProvider's generic — a mismatch inherent to
            rendering an arbitrary element as a route. */}
        <RouterProvider router={router as unknown as AnyRouter} />
      </QueryClientProvider>
    </ThemeProvider>,
    options
  );

  return {
    // `user` is returned already set up so tests never call userEvent.setup()
    // themselves — doing it after render is the usual cause of events silently
    // not firing.
    user: userEvent.setup(),
    queryClient,
    ...result,
  };
};

// Re-export the library surface so a test file has one import, and so swapping the
// renderer later is a change in this file rather than in every test.
export * from '@testing-library/react';
export { renderWithProviders as render };
