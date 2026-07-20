import { Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '~/utils';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface Props {
  title?: string;
  children?: ReactNode;
  extraRight?: ReactNode;
  showBack?: boolean | { enabled: boolean; link: string; tootipTitle?: string };
  stickyHeader?: boolean;
}

export function Container(props: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const { title, children, extraRight, showBack = false, stickyHeader = false } = props;

  const handleBack = () => {
    if (typeof showBack === 'boolean') {
      router.history.back();
    } else if (showBack?.link) {
      void navigate({ to: showBack.link as '/' });
    }
  };

  const showContainerHeader = Boolean(title) || Boolean(extraRight);
  const showBackButton = typeof showBack === 'boolean' ? showBack : showBack?.enabled;
  const tooltipTitle =
    typeof showBack === 'boolean' ? t('Common.Back') : (showBack?.tootipTitle ?? t('Common.Back'));

  return (
    <div className="relative h-full">
      {showContainerHeader && (
        <div
          className={cn('flex items-center justify-between gap-2 py-2', {
            'bg-background sticky top-0 z-10': stickyHeader,
          })}
        >
          {}
          <div className="flex min-h-9 items-center gap-2">
            {showBackButton && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                      <Undo2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tooltipTitle}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <h1 className="m-0 text-2xl font-medium">{title}</h1>
          </div>
          {extraRight}
        </div>
      )}
      {children}
    </div>
  );
}
