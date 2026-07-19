import { useEffect, useRef } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';

import { reportError } from '~/lib/observability/reporter';
import { ErrorPage } from '~/components/errors/error-page';

/**
 * The router's default error component. A component (not an inline arrow) so it can hold a
 * hook: route/data errors are swallowed by the router, so the global handler never sees them
 * — this forwards each to observability. The `useRef` guard reports a given error identity
 * once, absorbing StrictMode's dev double-invoke and re-renders with the same error.
 */
export function RouteErrorReporter({ error }: ErrorComponentProps) {
  const reported = useRef<unknown>(null);
  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    reportError(error);
  }, [error]);
  return <ErrorPage subTitle={error.message} />;
}
