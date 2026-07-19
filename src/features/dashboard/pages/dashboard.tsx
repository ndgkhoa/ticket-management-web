import { useTranslation } from 'react-i18next';

import { Container } from '~/components/ui';
import {
  useAgentPerformance,
  useCategoryDistribution,
  useDashboardKpis,
  useDashboardVolume,
  usePriorityDistribution,
  useStatusDistribution,
} from '~/features/dashboard/api/dashboard-queries';
import { useDashboardRange } from '~/features/dashboard/hooks/use-dashboard-search-params';
import { formatMinutes } from '~/utils/format';
import { KpiCard } from '~/features/dashboard/components/kpi-card';
import { ChartCard } from '~/features/dashboard/components/chart-card';
import { DashboardRangeFilter } from '~/features/dashboard/components/dashboard-range-filter';
import { VolumeChart } from '~/features/dashboard/components/charts/volume-chart';
import { StatusDonut } from '~/features/dashboard/components/charts/status-donut';
import { PriorityBar } from '~/features/dashboard/components/charts/priority-bar';
import { CategoryBar } from '~/features/dashboard/components/charts/category-bar';
import { AgentPerformanceTable } from '~/features/dashboard/components/charts/agent-performance-table';

/**
 * Operational dashboard: role-scoped KPIs + charts over a 7/30/90-day window. Every metric is a
 * Postgres aggregation (see `dashboard-api`); the page only picks the window and lays the cards
 * out. Each card owns its loading/empty state, so a slow or empty metric never blocks the rest.
 */
function Dashboard() {
  const { t } = useTranslation();
  const { range } = useDashboardRange();

  const kpis = useDashboardKpis(range);
  const volume = useDashboardVolume(range);
  const status = useStatusDistribution(range);
  const priority = usePriorityDistribution(range);
  const category = useCategoryDistribution(range);
  const agents = useAgentPerformance(range);

  const k = kpis.data;
  const isEmpty = (length: number | undefined) => (length ?? 0) === 0;

  return (
    <Container title={t('Dashboard.Title')}>
      <div className="mb-4 flex justify-end">
        <DashboardRangeFilter />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t('Dashboard.OpenTickets')}
          value={k ? String(k.openCount) : '—'}
          isLoading={kpis.isLoading}
          isError={kpis.isError}
        />
        <KpiCard
          label={t('Dashboard.AvgFirstResponse')}
          value={formatMinutes(k?.avgFirstResponseMins ?? null)}
          isLoading={kpis.isLoading}
          isError={kpis.isError}
        />
        <KpiCard
          label={t('Dashboard.AvgResolution')}
          value={formatMinutes(k?.avgResolutionMins ?? null)}
          isLoading={kpis.isLoading}
          isError={kpis.isError}
        />
        <KpiCard
          label={t('Dashboard.SlaCompliance')}
          value={k?.slaCompliancePct == null ? '—' : `${k.slaCompliancePct}%`}
          isLoading={kpis.isLoading}
          isError={kpis.isError}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t('Dashboard.Volume')}
          className="lg:col-span-2"
          isLoading={volume.isLoading}
          isError={volume.isError}
          isEmpty={isEmpty(volume.data?.length)}
        >
          <VolumeChart data={volume.data ?? []} />
        </ChartCard>

        <ChartCard
          title={t('Dashboard.StatusDistribution')}
          isLoading={status.isLoading}
          isError={status.isError}
          isEmpty={isEmpty(status.data?.length)}
        >
          <StatusDonut data={status.data ?? []} />
        </ChartCard>

        <ChartCard
          title={t('Dashboard.PriorityBreakdown')}
          isLoading={priority.isLoading}
          isError={priority.isError}
          isEmpty={isEmpty(priority.data?.length)}
        >
          <PriorityBar data={priority.data ?? []} />
        </ChartCard>

        <ChartCard
          title={t('Dashboard.ByCategory')}
          isLoading={category.isLoading}
          isError={category.isError}
          isEmpty={isEmpty(category.data?.length)}
        >
          <CategoryBar data={category.data ?? []} />
        </ChartCard>

        <ChartCard
          title={t('Dashboard.AgentPerformance')}
          asImage={false}
          isLoading={agents.isLoading}
          isError={agents.isError}
          isEmpty={isEmpty(agents.data?.length)}
        >
          <AgentPerformanceTable data={agents.data ?? []} />
        </ChartCard>
      </div>
    </Container>
  );
}

export default Dashboard;
