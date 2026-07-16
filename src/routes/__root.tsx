import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import type { QueryClient } from '@tanstack/react-query';

/**
 * The router's context carries the QueryClient so loaders can call
 * `ensureQueryData` without importing the singleton — the same client the app
 * renders with, injected once in `app/router.tsx`.
 */
export type RouterContext = {
  queryClient: QueryClient;
};

// Devtools are dev-only and lazily loaded, so they never reach the production bundle.
const RouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    );

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <RouterDevtools position="bottom-right" />
      </Suspense>
    </>
  );
}

// The root intentionally renders no providers: QueryClient, antd's ConfigProvider and
// the outer error boundary wrap `RouterProvider` in `app/provider.tsx`, so they exist
// above the router and cover it.
