import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryClient } from '~/lib/query-client';
import { roleApi } from '~/features/admin/roles/api/role-api';
import { roleKeys } from '~/features/admin/roles/constants/role-keys';

type Variables = Parameters<typeof roleApi.create>[0];
type Data = Awaited<ReturnType<typeof roleApi.create>>;

queryClient.setMutationDefaults(roleKeys.create(), {
  mutationFn: (vars: Variables) => roleApi.create(vars),
});

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<Data, Error, Variables>({
    mutationKey: roleKeys.create(),
  });

  const isMutating = useIsMutating({ mutationKey: roleKeys.create() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: roleKeys.all });
  };

  return { ...mutation, invalidate, isPending: mutation.isPending || Boolean(isMutating) };
};
