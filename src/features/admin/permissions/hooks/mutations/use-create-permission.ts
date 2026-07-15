import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryClient } from '~/lib/query-client';
import { permissionApi } from '~/features/admin/permissions/api/permission-api';
import { permissionKeys } from '~/features/admin/permissions/constants/permission-keys';

type Variables = Parameters<typeof permissionApi.create>[0];
type Data = Awaited<ReturnType<typeof permissionApi.create>>;

queryClient.setMutationDefaults(permissionKeys.create(), {
  mutationFn: (vars: Variables) => permissionApi.create(vars),
});

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<Data, Error, Variables>({
    mutationKey: permissionKeys.create(),
  });

  const isMutating = useIsMutating({ mutationKey: permissionKeys.create() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: permissionKeys.all });
  };

  return { ...mutation, invalidate, isPending: mutation.isPending || Boolean(isMutating) };
};
