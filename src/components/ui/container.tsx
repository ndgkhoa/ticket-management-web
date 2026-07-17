import { Flex, Tooltip } from 'antd';
import { Undo2 } from 'lucide-react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '~/utils';
import { Button } from '~/components/ui/button';

interface Props {
  title?: string;
  children?: ReactNode;
  extraRight?: ReactNode;
  showBack?: boolean | { enabled: boolean; link: string; tootipTitle?: string };
  stickyHeader?: boolean;
}

export const Container = (props: Props) => {
  const navigate = useNavigate();
  const router = useRouter();
  const { title, children, extraRight, showBack = false, stickyHeader = false } = props;

  const onBack = () => {
    // Boolean = go back in history; an explicit link navigates there. The cast bridges
    // the free-form `link` prop to the typed router until this antd component is
    // replaced in the design-system phase.
    if (typeof showBack === 'boolean') {
      router.history.back();
    } else if (showBack?.link) {
      void navigate({ to: showBack.link as '/' });
    }
  };

  const showContainerHeader = Boolean(title) || Boolean(extraRight);
  const showBackButton = typeof showBack === 'boolean' ? showBack : showBack?.enabled;
  const tooltipTitle = typeof showBack === 'boolean' ? 'Trở về' : showBack?.tootipTitle;

  return (
    <div className="relative h-full overflow-auto">
      {showContainerHeader && (
        <Flex
          align="center"
          justify="space-between"
          className={cn('!py-2', { 'sticky top-0 z-10': stickyHeader })}
          gap="small"
        >
          <Flex gap="small">
            {showBackButton && (
              <Tooltip destroyOnHidden title={tooltipTitle ?? 'Trở về'}>
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <Undo2 />
                </Button>
              </Tooltip>
            )}
            <h1 className="m-0 text-2xl font-medium">{title}</h1>
          </Flex>
          {extraRight}
        </Flex>
      )}
      {children}
    </div>
  );
};
