import { queryOptions, useQuery } from '@tanstack/react-query';

import { permissionApi } from '~/features/admin/permissions/api/permission-api';
import { permissionKeys } from '~/features/admin/permissions/constants/permission-keys';

/**
 * queryOptions factory + hook, colocated with the fetcher they wrap: a query and its
 * fetcher change together, so splitting them across folders means every change
 * touches two files. The factory is shared by the hook and, later, route loaders
 * (`ensureQueryData`) so the data is warm before the page renders.
 */
export const permissionQueries = {
  list: () =>
    queryOptions({
      queryKey: permissionKeys.list(),
      queryFn: permissionApi.list,
    }),
};

export const usePermissionList = () => useQuery(permissionQueries.list());
