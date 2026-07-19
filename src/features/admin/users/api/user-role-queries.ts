import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { userRoleApi } from '~/features/admin/users/api/user-role-api';
import { userKeys } from '~/features/admin/users/constants/user-keys';

/** The role ids a user currently holds. */
export const useUserRoles = (userId: string) =>
  useQuery(
    queryOptions({
      queryKey: userKeys.roles(userId),
      queryFn: () => userRoleApi.listForUser(userId),
    })
  );

/**
 * Toggle one role on a user — add or remove the junction row, then refetch the user's
 * set. Invalidate-on-success (not optimistic), mirroring `useToggleRolePermission`: a
 * user holds a handful of roles at most, so a refetch is cheap and can't desync from
 * what the server actually stored.
 */
export const useToggleUserRole = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, checked }: { roleId: string; checked: boolean }) =>
      checked ? userRoleApi.add(userId, roleId) : userRoleApi.remove(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.roles(userId) }),
  });
};
