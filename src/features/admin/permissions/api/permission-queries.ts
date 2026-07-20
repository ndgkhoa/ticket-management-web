import { queryOptions, useQuery } from '@tanstack/react-query';

import { permissionApi } from '~/features/admin/permissions/api/permission-api';
import { permissionKeys } from '~/features/admin/permissions/constants/permission-keys';

export const permissionQueries = {
  list: () =>
    queryOptions({
      queryKey: permissionKeys.list(),
      queryFn: permissionApi.list,
    }),
};

export const usePermissionList = () => useQuery(permissionQueries.list());
