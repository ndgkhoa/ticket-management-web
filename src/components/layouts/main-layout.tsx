import { memo, Suspense } from 'react';
import { Outlet } from '@tanstack/react-router';

import { FullPageFallback } from '~/components/fallbacks';
import { Sidebar, Navbar, Breadcrumb } from '~/components/ui';

const LayoutContent = memo(function LayoutContent() {
  return (
    <main className="flex-1 [scrollbar-gutter:stable] overflow-auto px-4">
      <Breadcrumb />
      <Suspense fallback={<FullPageFallback />}>
        <Outlet />
      </Suspense>
    </main>
  );
});

export function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <LayoutContent />
      </div>
    </div>
  );
}
