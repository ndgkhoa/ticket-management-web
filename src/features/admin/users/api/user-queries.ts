import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import type { ListParams } from '~/lib/list-query';
import { userApi } from '~/features/admin/users/api/user-api';
import { userKeys } from '~/features/admin/users/constants/user-keys';

/**
 * queryOptions factory, shared by the hook and the route loader (`ensureQueryData`) —
 * mirrors `ticket-queries.ts`. `keepPreviousData` holds the previous page on screen
 * while the next loads.
 */
export const userQueries = {
  list: (params: ListParams) =>
    queryOptions({
      queryKey: userKeys.list(params),
      queryFn: () => userApi.list(params),
      placeholderData: keepPreviousData,
    }),
};

export const useUserList = (params: ListParams) => useQuery(userQueries.list(params));
