import { getRouteApi } from '@tanstack/react-router';

import {
  PAGE_RESETTING_KEYS,
  type TicketSearch,
} from '~/features/tickets/schemas/ticket-search-schema';

const route = getRouteApi('/_app/tickets/');

type SearchPatch = Partial<TicketSearch>;

/** A change to any of these resets the user to page 1 — enforced here, not per call. */
function resetsPage(patch: SearchPatch): boolean {
  return PAGE_RESETTING_KEYS.some((key) => key in patch);
}

/**
 * The one place ticket list params are written.
 *
 * Every update spreads the previous search — a bare object would wipe the other
 * filters — and resets `page` to 1 whenever a filter, the query or the page size
 * changes, so no call site can strand the user on a page that no longer exists.
 *
 * `replace` is for search-input keystrokes: navigating with `replace: true` keeps
 * typing from stacking a history entry per character. The caller debounces the write
 * itself; this hook only owns the merge-and-reset rule.
 */
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

  return { search, setSearch };
}
