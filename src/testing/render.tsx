import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider, App as AntApp } from 'antd';
import queryString from 'query-string';
import { MemoryRouter } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import type { RenderOptions } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';

import { theme } from '~/styles/theme';

/**
 * A fresh QueryClient per render — never the app singleton from `lib/query-client`.
 *
 * The singleton would carry its cache from one test into the next, so a test could
 * pass only because an earlier one warmed the data. Retries are off because a
 * deliberate error case would otherwise burn the timeout budget retrying before it
 * ever reports; the same applies to the retry-on-mount default.
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });

type RenderConfig = Omit<RenderOptions, 'wrapper'> & {
  /** Entries the router starts with — pass a URL to test a list's search params. */
  routerEntries?: string[];
};

/**
 * Renders inside the app's real providers.
 *
 * Two deliberate differences from `app/provider.tsx`: MemoryRouter instead of
 * BrowserRouter (a test drives navigation by argument, not by jsdom's URL bar), and
 * no devtools. Everything else matches, so a component that works here works in the
 * app — the point of a shared helper is that no test re-wires providers and quietly
 * tests a different tree than the one that ships.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { routerEntries, ...options }: RenderConfig = {}
) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <AntApp>
          <MemoryRouter initialEntries={routerEntries ?? ['/']}>
            <QueryParamProvider
              adapter={ReactRouter6Adapter}
              options={{
                searchStringToObject: queryString.parse,
                objectToSearchString: queryString.stringify,
              }}
            >
              {children}
            </QueryParamProvider>
          </MemoryRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );

  return {
    // `user` is returned already set up so tests never call userEvent.setup()
    // themselves — doing it after render is the usual cause of events silently
    // not firing.
    user: userEvent.setup(),
    queryClient,
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
  };
};

// Re-export the library surface so a test file has one import, and so swapping the
// renderer later is a change in this file rather than in every test.
export * from '@testing-library/react';
export { renderWithProviders as render };
