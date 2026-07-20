import { getRouteApi } from '@tanstack/react-router';

import {
  PAGE_RESETTING_KEYS,
  type CannedResponseSearch,
} from '~/features/admin/canned-responses/schemas/canned-response-search-schema';

const route = getRouteApi('/_app/admin/canned-responses');

type SearchPatch = Partial<CannedResponseSearch>;

function resetsPage(patch: SearchPatch): boolean {
  return PAGE_RESETTING_KEYS.some((key) => key in patch);
}

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
