import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { ConfigProvider, App } from 'antd';
import { RouterProvider } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { router } from '~/app/router';
import { queryClient } from '~/lib/query-client';
import { subscribeToAuth, useAuthStore } from '~/stores/auth';
import { subscribeToTheme } from '~/lib/theme';
import { FullscreenFallback, ErrorBoundaryFallback } from '~/components/fallbacks';
import { Toaster } from '~/components/ui/sonner';
import { theme } from '~/styles/theme';

/**
 * App shell. The provider order, outermost first: an error boundary for render errors
 * in these shell components (route and data errors are the router's job, via its
 * `defaultErrorComponent` — the two halves of the error split), then the QueryClient,
 * then antd's config and message context, then the router itself.
 *
 * `RouterProvider` is withheld until the initial Supabase session resolves
 * (`status !== 'loading'`), so a `beforeLoad` guard never runs against an unknown
 * session and never flashes a signed-in user to the login screen.
 */
const AppProviders = () => {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuth();
    // Re-run the route guards on every auth change, so signing out on a protected
    // route redirects to sign-in with no manual navigation.
    const unsubscribeStore = useAuthStore.subscribe(() => {
      void router.invalidate();
    });
    // Keep the <html> theme class in step with the preference and the OS setting.
    const unsubscribeTheme = subscribeToTheme();
    return () => {
      unsubscribeAuth();
      unsubscribeStore();
      unsubscribeTheme();
    };
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={theme}>
          <App>
            {status === 'loading' ? <FullscreenFallback /> : <RouterProvider router={router} />}
            <Toaster />
            <ReactQueryDevtools initialIsOpen={false} position="left" />
          </App>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
