import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';
import type { QueryClient } from '@tanstack/react-query';

export type RouterContext = {
  queryClient: QueryClient;
};

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
        <RouterDevtools position="bottom-left" />
      </Suspense>
    </>
  );
}
