import { Suspense } from 'react';
import { Outlet } from '@tanstack/react-router';

import { FullscreenFallback } from '~/components/fallbacks';

export function AuthLayout() {
  return (
    <Suspense fallback={<FullscreenFallback />}>
      <Outlet />
    </Suspense>
  );
}
