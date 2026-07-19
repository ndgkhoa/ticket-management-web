import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '~/components/ui';
import { cn } from '~/utils/cn';

type Props = {
  title: string;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  className?: string;
  /**
   * True for a visual chart: the card becomes `role="img"` with the title as its accessible name,
   * so a screen reader announces the label and skips Recharts' meaningless SVG internals. False
   * when the body is itself accessible (the agent table) — keep its semantics exposed.
   */
  asImage?: boolean;
  children: ReactNode;
};

/**
 * A titled card that hosts a chart, with its own loading (skeleton) and empty states, so each
 * chart's own render code can assume it always has data.
 */
export function ChartCard({
  title,
  isLoading,
  isError,
  isEmpty,
  className,
  asImage = true,
  children,
}: Props) {
  const { t } = useTranslation();
  return (
    <section
      className={cn('rounded-md border p-4', className)}
      aria-label={asImage ? title : undefined}
      role={asImage ? 'img' : undefined}
    >
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <p className="text-destructive flex h-64 items-center justify-center text-sm">
          {t('Dashboard.LoadError')}
        </p>
      ) : isEmpty ? (
        <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
          {t('Dashboard.NoData')}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
