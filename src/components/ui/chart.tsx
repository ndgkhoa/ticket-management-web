import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

import { cn } from '~/utils/cn';

/**
 * A minimal chart shell for the Recharts-based dashboard charts: a sized, responsive box.
 * Colours come from the design system's `--chart-1..5` tokens (defined for light + dark in
 * `styles/index.css`), so charts theme themselves — pass `CHART_COLORS[i]` to a series' fill/
 * stroke and it follows the active theme with no per-chart wiring.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

/**
 * Theme-aware styling for Recharts' tooltip (its default is a hard-coded white box with black
 * text — invisible in dark mode). `contentStyle` themes the box; `labelStyle`/`itemStyle` must be
 * set too, or the label + "count" rows keep Recharts' default black. Pass all three to `<Tooltip>`.
 */
export const CHART_TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  color: 'var(--foreground)',
  fontSize: '0.8125rem',
} as const;

export const CHART_TOOLTIP_TEXT_STYLE = { color: 'var(--foreground)' } as const;

/**
 * Axis tick styling: the design system's muted-foreground token, so labels read as secondary
 * (correct for axes) but stay AA-legible in both themes — Recharts' default `#666` is too faint
 * on a dark background and ignores the theme.
 */
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
