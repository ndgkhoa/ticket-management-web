import type { FallbackProps } from 'react-error-boundary';

import { Button } from '~/components/ui';
import { ErrorState } from '~/components/errors';

/**
 * Renders for a render error in the shell components, above the router — so no router
 * or i18n context is assumed here. Copy is intentionally plain English literals: an
 * error boundary must render even when the tree (i18n included) is broken.
 */
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
