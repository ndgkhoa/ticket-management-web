import { getRouteApi } from '@tanstack/react-router';

import {
  PAGE_RESETTING_KEYS,
  type TicketSearch,
} from '~/features/tickets/schemas/ticket-search-schema';

const route = getRouteApi('/_app/tickets/');

type SearchPatch = Partial<TicketSearch>;

function resetsPage(patch: SearchPatch): boolean {
  return PAGE_RESETTING_KEYS.some((key) => key in patch);
}

export function useTicketSearchParams() {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const setSearch = (patch: SearchPatch, options?: { replace?: boolean }) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        page: resetsPage(patch) ? 1 : (patch.page ?? prev.page),
      }),
      replace: options?.replace,
    });
  };

  const applySearch = (next: TicketSearch) => {
    void navigate({ search: () => next });
  };

  return { search, setSearch, applySearch };
}
