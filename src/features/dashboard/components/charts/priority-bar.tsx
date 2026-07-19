import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';

import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_TEXT_STYLE,
  ChartContainer,
} from '~/components/ui';
import type { DistributionSlice } from '~/features/dashboard/schemas/dashboard-schema';

/** Ticket count per priority. */
export function PriorityBar({ data }: { data: DistributionSlice[] }) {
  return (
    <ChartContainer>
      <BarChart data={data} accessibilityLayer margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={36}
          tick={CHART_AXIS_TICK}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_TOOLTIP_TEXT_STYLE}
          itemStyle={CHART_TOOLTIP_TEXT_STYLE}
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((slice, index) => (
            <Cell key={slice.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
