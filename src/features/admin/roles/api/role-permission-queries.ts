import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { rolePermissionApi } from '~/features/admin/roles/api/role-permission-api';
import { roleKeys } from '~/features/admin/roles/constants/role-keys';

/** The permission ids a role currently holds. */
export const useRolePermissions = (roleId: string) =>
  useQuery(
    queryOptions({
      queryKey: roleKeys.permissions(roleId),
      queryFn: () => rolePermissionApi.listForRole(roleId),
    })
  );

/**
 * Toggle one permission on a role — add or remove the junction row, then refetch the
 * role's set. Invalidate-on-success (not optimistic): a role holds a couple dozen codes
 * at most, so a refetch is cheap and can't desync from what the server actually stored.
 */
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
