import { queryOptions, useQuery } from '@tanstack/react-query';

import { userApi } from '~/features/admin/users/api/user-api';
import { userKeys } from '~/features/admin/users/constants/user-keys';

export const userQueries = {
  list: () =>
    queryOptions({
      queryKey: userKeys.list(),
      queryFn: userApi.list,
    }),
};

export const useUserList = () => useQuery(userQueries.list());
