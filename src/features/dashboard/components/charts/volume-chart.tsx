import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';

import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_TEXT_STYLE,
  ChartContainer,
} from '~/components/ui';
import type { VolumePoint } from '~/features/dashboard/schemas/dashboard-schema';

/** Daily created vs resolved volume over the window. */
export function VolumeChart({ data }: { data: VolumePoint[] }) {
  const { t } = useTranslation();
  return (
    <ChartContainer>
      <AreaChart data={data} accessibilityLayer margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tickFormatter={(day: string) => day.slice(5)}
          tickLine={false}
          axisLine={false}
          tick={CHART_AXIS_TICK}
          minTickGap={24}
        />
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
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="created"
          name={t('Dashboard.Created')}
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.2}
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name={t('Dashboard.Resolved')}
          stroke={CHART_COLORS[1]}
          fill={CHART_COLORS[1]}
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
