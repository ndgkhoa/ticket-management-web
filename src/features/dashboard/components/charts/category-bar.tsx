import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts';

import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_TEXT_STYLE,
  ChartContainer,
} from '~/components/ui';
import type { DistributionSlice } from '~/features/dashboard/schemas/dashboard-schema';

export function CategoryBar({ data }: { data: DistributionSlice[] }) {
  return (
    <ChartContainer>
      <BarChart
        data={data}
        layout="vertical"
        accessibilityLayer
        margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
      >
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={CHART_AXIS_TICK}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_TOOLTIP_TEXT_STYLE}
          itemStyle={CHART_TOOLTIP_TEXT_STYLE}
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={CHART_COLORS[2]} />
      </BarChart>
    </ChartContainer>
  );
}
