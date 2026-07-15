import { memo, Suspense } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import { FullPageFallback } from '~/components/fallbacks';
import { Sidebar, Navbar, Footer, Breadcrumb } from '~/components/ui';

const LayoutContent = memo(() => {
  return (
    <Layout.Content className="h-[calc(100vh)] px-4">
      <Breadcrumb />
      <Suspense fallback={<FullPageFallback />}>
        <Outlet />
      </Suspense>
    </Layout.Content>
  );
});

export const MainLayout = () => {
  return (
    <Layout className="h-screen w-screen overflow-hidden">
      <Sidebar />
      <Layout>
        <Navbar />
        <LayoutContent />
        <Footer />
      </Layout>
    </Layout>
  );
};
