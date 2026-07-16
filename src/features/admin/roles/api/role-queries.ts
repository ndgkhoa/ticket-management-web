import { queryOptions, useQuery } from '@tanstack/react-query';

import { roleApi } from '~/features/admin/roles/api/role-api';
import { roleKeys } from '~/features/admin/roles/constants/role-keys';

export const roleQueries = {
  list: () =>
    queryOptions({
      queryKey: roleKeys.list(),
      queryFn: roleApi.list,
    }),
};

export const useRoleList = () => useQuery(roleQueries.list());
