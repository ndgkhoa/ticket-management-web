import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { router } from '~/app/router';
import { queryClient } from '~/lib/query-client';
import { reportError } from '~/lib/observability/reporter';
import { subscribeToAuth, useAuthStore } from '~/stores/auth';
import { ThemeProvider } from '~/components/theme-provider';
import { FullscreenFallback, ErrorBoundaryFallback } from '~/components/fallbacks';
import { Toaster } from '~/components/ui';

function App() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuth();
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
      <ErrorBoundary
        FallbackComponent={ErrorBoundaryFallback}
        onError={(error, info) => reportError(error, { componentStack: info.componentStack })}
      >
        <QueryClientProvider client={queryClient}>
          {status === 'loading' ? <FullscreenFallback /> : <RouterProvider router={router} />}
          <Toaster />
          {}
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
