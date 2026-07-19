import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import Dashboard from '~/features/dashboard/pages/dashboard';
import {
  DEFAULT_RANGE,
  dashboardSearchSchema,
} from '~/features/dashboard/schemas/dashboard-search-schema';

/**
 * `/` — the analytics dashboard. `range` (7/30/90 days) validates to a safe default; the default
 * is stripped from the URL, so the clean `/` shows the 30-day view and only 7/90 appear as a param.
 */
export const Route = createFileRoute('/_app/')({
  validateSearch: dashboardSearchSchema,
  search: { middlewares: [stripSearchParams({ range: DEFAULT_RANGE })] },
  component: Dashboard,
});
