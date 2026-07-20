import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rolePermissionApi } from '~/features/admin/roles/api/role-permission-api';
import { roleKeys } from '~/features/admin/roles/constants/role-keys';

export const useRolePermissions = (roleId: string) =>
  useQuery(
    queryOptions({
      queryKey: roleKeys.permissions(roleId),
      queryFn: () => rolePermissionApi.listForRole(roleId),
    })
  );

export const useToggleRolePermission = (roleId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ permissionId, checked }: { permissionId: string; checked: boolean }) =>
      checked
        ? rolePermissionApi.add(roleId, permissionId)
        : rolePermissionApi.remove(roleId, permissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roleKeys.permissions(roleId) }),
  });
};
