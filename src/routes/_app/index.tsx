import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import Dashboard from '~/features/dashboard/pages/dashboard';
import {
  DEFAULT_RANGE,
  dashboardSearchSchema,
} from '~/features/dashboard/schemas/dashboard-search-schema';

export const Route = createFileRoute('/_app/')({
  validateSearch: dashboardSearchSchema,
  search: { middlewares: [stripSearchParams({ range: DEFAULT_RANGE })] },
  component: Dashboard,
});
