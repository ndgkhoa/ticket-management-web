import { getRouteApi } from '@tanstack/react-router';

import type { DashboardRange } from '~/features/dashboard/schemas/dashboard-search-schema';

const route = getRouteApi('/_app/');

/** Read + write the dashboard's `range` window param (URL-as-truth, like the list pages). */
export function useDashboardRange() {
  const { range } = route.useSearch();
  const navigate = route.useNavigate();

  const setRange = (next: DashboardRange) => {
    void navigate({ search: { range: next } });
  };

  return { range, setRange };
}
