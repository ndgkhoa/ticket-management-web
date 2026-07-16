import { CircleChevronLeft } from 'lucide-react';
import { Tooltip } from 'antd';
import { useRouter } from '@tanstack/react-router';
import Sider from 'antd/es/layout/Sider';
import type { ReactNode } from 'react';

import { Button, Footer } from '~/components/ui';

interface PageHeaderLayoutProps {
  children?: ReactNode;
  replace?: boolean;
  label?: string;
  extra?: ReactNode;
  back?: boolean;
}

interface PageSiderProps {
  children?: ReactNode;
  width?: number;
  collapsible?: boolean;
}

const PageHeaderLayout = (props: PageHeaderLayoutProps) => {
  const router = useRouter();
  const { label, extra, replace, back, children } = props;

  if (replace) return children;
  return (
    <div className="mt-2 mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {back && (
          <Tooltip title="Trở về">
            <Button
              type="text"
              shape="circle"
              icon={<CircleChevronLeft size={28} strokeWidth={1.5} color="#1f2937" />}
              onClick={() => router.history.back()}
            />
          </Tooltip>
        )}
        <h1 className="m-0 text-2xl font-normal">{label}</h1>
      </div>
      {extra}
    </div>
  );
};

const PageContentLayout = ({ children }: { children?: ReactNode }) => {
  return children;
};

const PageSider = ({ children, width = 220, collapsible = true }: PageSiderProps) => {
  return (
    <Sider className="mr-3 !bg-white" width={width} trigger={null} collapsible={collapsible}>
      {children}
    </Sider>
  );
};

export const PageLayout = ({
  children,
  footer = true,
}: {
  children?: ReactNode;
  footer?: boolean;
}) => {
  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <div className="flex-1 p-2">{children}</div>
      {footer && <Footer />}
    </div>
  );
};

PageLayout.Header = PageHeaderLayout;
PageLayout.Content = PageContentLayout;
PageLayout.Sider = PageSider;
