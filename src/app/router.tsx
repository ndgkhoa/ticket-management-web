import { createRouter } from '@tanstack/react-router';

import { routeTree } from '~/routeTree.gen';
import { queryClient } from '~/lib/query-client';
import { FullPageFallback } from '~/components/fallbacks';
import { ErrorPage } from '~/components/errors';

/**
 * The router.
 *
 * The QueryClient rides in the router context so loaders reach it with
 * `context.queryClient` instead of importing the singleton — the same instance the
 * app renders with.
 *
 * `defaultPreload: 'intent'` prefetches a route's data on link hover/focus, so a
 * click usually lands on warm data. The default pending/error components cover every
 * route that doesn't set its own: a loader in flight shows the fallback, and a
 * route/data error renders `ErrorPage`. This is the router half of the error split —
 * render errors in shell components outside the route tree are caught by the
 * react-error-boundary in `app/provider.tsx`.
 */
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPendingComponent: FullPageFallback,
  defaultErrorComponent: ({ error }) => <ErrorPage subTitle={error.message} />,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
