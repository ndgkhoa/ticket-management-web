import { createRouter } from '@tanstack/react-router';

import { routeTree } from '~/routeTree.gen';
import { queryClient } from '~/lib/query-client';
import { FullPageFallback } from '~/components/fallbacks';
import { NotFound, RouteErrorReporter } from '~/components/errors';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPendingComponent: FullPageFallback,
  defaultErrorComponent: RouteErrorReporter,
  defaultNotFoundComponent: NotFound,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
