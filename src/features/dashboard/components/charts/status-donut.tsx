import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts';

import {
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_TEXT_STYLE,
  ChartContainer,
} from '~/components/ui';
import type { DistributionSlice } from '~/features/dashboard/schemas/dashboard-schema';

export function StatusDonut({ data }: { data: DistributionSlice[] }) {
  return (
    <ChartContainer>
      <PieChart accessibilityLayer>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
        >
          {data.map((slice, index) => (
            <Cell key={slice.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_TOOLTIP_TEXT_STYLE}
          itemStyle={CHART_TOOLTIP_TEXT_STYLE}
        />
        <Legend />
      </PieChart>
    </ChartContainer>
  );
}
