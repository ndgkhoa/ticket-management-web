import type { FallbackProps } from 'react-error-boundary';

import { Button } from '~/components/ui';
import { ErrorState } from '~/components/errors';

export function ErrorBoundaryFallback({ resetErrorBoundary }: FallbackProps) {
  const handleBack = () => {
    resetErrorBoundary();
    window.location.reload();
  };
  return (
    <ErrorState
      code="500"
      title="Something went wrong"
      description="Sorry, an unexpected error occurred."
      action={<Button onClick={handleBack}>Back to home</Button>}
    />
  );
}
