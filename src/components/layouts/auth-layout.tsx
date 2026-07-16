import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '~/stores/auth';
import { FullscreenFallback } from '~/components/fallbacks';

/**
 * The inverse of the protected route: keep an already-signed-in user out of the auth
 * screens. Waits out `loading` so a returning user with a persisted session lands on
 * the app, not on a sign-in page that flashes and redirects.
 */
export const AuthLayout = () => {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <FullscreenFallback />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<FullscreenFallback />}>
      <Outlet />
    </Suspense>
  );
};
