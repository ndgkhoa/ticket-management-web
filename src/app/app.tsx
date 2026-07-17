import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { router } from '~/app/router';
import { queryClient } from '~/lib/query-client';
import { subscribeToAuth, useAuthStore } from '~/stores/auth';
import { ThemeProvider } from '~/components/theme-provider';
import { FullscreenFallback, ErrorBoundaryFallback } from '~/components/fallbacks';
import { Toaster } from '~/components/ui/sonner';

/**
 * App shell. The provider order, outermost first: the ThemeProvider (owns light/dark),
 * an error boundary for render errors in these shell components (route and data errors
 * are the router's job, via its `defaultErrorComponent` — the two halves of the error
 * split), then the QueryClient, then the router itself.
 *
 * `RouterProvider` is withheld until the initial Supabase session resolves
 * (`status !== 'loading'`), so a `beforeLoad` guard never runs against an unknown
 * session and never flashes a signed-in user to the login screen.
 */
function App() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuth();
    // Re-run the route guards on every auth change, so signing out on a protected
    // route redirects to sign-in with no manual navigation.
    const unsubscribeStore = useAuthStore.subscribe(() => {
      void router.invalidate();
    });
    return () => {
      unsubscribeAuth();
      unsubscribeStore();
    };
  }, []);

  return (
    <ThemeProvider>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <QueryClientProvider client={queryClient}>
          {status === 'loading' ? <FullscreenFallback /> : <RouterProvider router={router} />}
          <Toaster />
          {/* Toggle pinned bottom-right so it doesn't stack on the Router devtools
              button (bottom-left). Both are dev-only and absent from the prod bundle. */}
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
