import { useEffect, useRef } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';

import { reportError } from '~/lib/observability/reporter';
import { ErrorPage } from '~/components/errors/error-page';

export function RouteErrorReporter({ error }: ErrorComponentProps) {
  const reported = useRef<unknown>(null);
  useEffect(() => {
    if (reported.current === error) return;
    reported.current = error;
    reportError(error);
  }, [error]);
  return <ErrorPage subTitle={error.message} />;
}
