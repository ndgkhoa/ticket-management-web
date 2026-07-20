import { getRouteApi } from '@tanstack/react-router';

import {
  PAGE_RESETTING_KEYS,
  type UserSearch,
} from '~/features/admin/users/schemas/user-search-schema';

const route = getRouteApi('/_app/admin/users');

type SearchPatch = Partial<UserSearch>;

function resetsPage(patch: SearchPatch): boolean {
  return PAGE_RESETTING_KEYS.some((key) => key in patch);
}

export function useUserSearchParams() {
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
