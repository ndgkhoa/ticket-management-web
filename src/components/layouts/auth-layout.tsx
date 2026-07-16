import { Suspense } from 'react';
import { Outlet } from '@tanstack/react-router';

import { FullscreenFallback } from '~/components/fallbacks';

/**
 * Shell for the auth screens. The "already signed in? go to the app" redirect lives
 * in the route's `beforeLoad` (see `routes/auth/route.tsx`), so this only renders the
 * outlet — one mechanism for the guard, not a component-level check racing it.
 */
export const AuthLayout = () => {
  return (
    <Suspense fallback={<FullscreenFallback />}>
      <Outlet />
    </Suspense>
  );
};
