import { type PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '~/stores/auth';
import { FullscreenFallback } from '~/components/fallbacks';

/**
 * Gate a subtree on an authenticated session.
 *
 * While the persisted session is still resolving (`status === 'loading'`) it holds a
 * fallback rather than redirecting — otherwise a signed-in user is bounced to the
 * login screen for a frame before the session loads. This guard is replaced by the
 * router's `beforeLoad` in the routing phase; it is kept faithful to the new store
 * shape only so the app compiles until then.
 */
export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return <FullscreenFallback />;
  if (status === 'authenticated') return children;

  return <Navigate to="/auth/sign-in" replace />;
};
