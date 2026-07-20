import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { userRoleApi } from '~/features/admin/users/api/user-role-api';
import { userKeys } from '~/features/admin/users/constants/user-keys';

export const useUserRoles = (userId: string) =>
  useQuery(
    queryOptions({
      queryKey: userKeys.roles(userId),
      queryFn: () => userRoleApi.listForUser(userId),
    })
  );

export const useToggleUserRole = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, checked }: { roleId: string; checked: boolean }) =>
      checked ? userRoleApi.add(userId, roleId) : userRoleApi.remove(userId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.roles(userId) }),
  });
};
