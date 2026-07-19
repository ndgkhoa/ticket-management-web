import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui';
import { useDashboardRange } from '~/features/dashboard/hooks/use-dashboard-search-params';
import { DASHBOARD_RANGES } from '~/features/dashboard/schemas/dashboard-search-schema';

/** The 7/30/90-day window toggle — writes `?range=` (URL-as-truth). */
export function DashboardRangeFilter() {
  const { t } = useTranslation();
  const { range, setRange } = useDashboardRange();

  return (
    <div className="flex gap-1" role="group" aria-label={t('Dashboard.Range')}>
      {DASHBOARD_RANGES.map((days) => (
        <Button
          key={days}
          type="button"
          size="sm"
          variant={range === days ? 'secondary' : 'ghost'}
          className="h-8"
          aria-pressed={range === days}
          onClick={() => setRange(days)}
        >
          {t('Dashboard.LastDays', { count: days })}
        </Button>
      ))}
    </div>
  );
}
