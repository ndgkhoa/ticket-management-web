import { Suspense, type PropsWithChildren } from 'react';
import { QueryErrorResetBoundary, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { ConfigProvider, App } from 'antd';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import queryString from 'query-string';

import { queryClient } from '~/lib/query-client';
import { FullscreenFallback, ErrorBoundaryFallback } from '~/components/fallbacks';
import { theme } from '~/styles/theme';

const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <Suspense fallback={<FullscreenFallback />}>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} FallbackComponent={ErrorBoundaryFallback}>
            <QueryClientProvider client={queryClient}>
              <ConfigProvider theme={theme}>
                <App>
                  <Router>
                    <QueryParamProvider
                      adapter={ReactRouter6Adapter}
                      options={{
                        searchStringToObject: queryString.parse,
                        objectToSearchString: queryString.stringify,
                      }}
                    >
                      {children}
                    </QueryParamProvider>
                  </Router>
                  <ReactQueryDevtools initialIsOpen={false} position="left" />
                </App>
              </ConfigProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </Suspense>
  );
};

export default AppProviders;
