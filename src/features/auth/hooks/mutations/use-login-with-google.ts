import { useIsMutating, useMutation } from '@tanstack/react-query';

import { queryClient } from '~/lib/query-client';
import { authApi } from '~/features/auth/api/auth-api';
import { authKeys } from '~/features/auth/constants/auth-keys';

queryClient.setMutationDefaults(authKeys.loginWithGoogle(), {
  mutationFn: () => authApi.loginWithGoogle(),
});

export const useLoginWithGoogle = () => {
  const mutation = useMutation<{ Message: string }, Error>({
    mutationKey: authKeys.loginWithGoogle(),
  });

  const isMutating = useIsMutating({ mutationKey: authKeys.loginWithGoogle() });

  const isPending = mutation.isPending || Boolean(isMutating);
  return { ...mutation, isPending };
};
