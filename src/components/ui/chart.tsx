import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

import { cn } from '~/utils/cn';

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

export const CHART_TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  color: 'var(--foreground)',
  fontSize: '0.8125rem',
} as const;

export const CHART_TOOLTIP_TEXT_STYLE = { color: 'var(--foreground)' } as const;

export const CHART_AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 } as const;

export function ChartContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactElement;
}) {
  return (
    <div className={cn('h-64 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
