import { getRouteApi } from '@tanstack/react-router';

import {
  PAGE_RESETTING_KEYS,
  type CannedResponseSearch,
} from '~/features/admin/canned-responses/schemas/canned-response-search-schema';

const route = getRouteApi('/_app/admin/canned-responses');

type SearchPatch = Partial<CannedResponseSearch>;

/** A change to any of these resets the user to page 1 — enforced here, not per call. */
function resetsPage(patch: SearchPatch): boolean {
  return PAGE_RESETTING_KEYS.some((key) => key in patch);
}

/**
 * The one place the canned-responses list params are written — mirrors
 * `use-user-search-params.ts`. Every update spreads the previous search and resets
 * `page` to 1 whenever the query or page size changes.
 */
export function useCannedResponseSearchParams() {
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
