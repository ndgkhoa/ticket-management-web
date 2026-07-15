import { useIsMutating, useMutation } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import { queryClient } from '~/lib/query-client';
import { authApi } from '~/features/auth/api/auth-api';
import { authKeys } from '~/features/auth/constants/auth-keys';
import type { AuthType } from '~/stores/auth';
import type { BaseResponse } from '~/types';

type Variables = Parameters<typeof authApi.loginWithUserName>[0];

queryClient.setMutationDefaults(authKeys.loginWithUserName(), {
  mutationFn: (variables: Variables) => authApi.loginWithUserName(variables),
});

export const useLoginWithUserName = () => {
  const mutation = useMutation<AxiosResponse<BaseResponse<AuthType>>, Error, Variables>({
    mutationKey: authKeys.loginWithUserName(),
  });

  const isMutating = useIsMutating({ mutationKey: authKeys.loginWithUserName() });

  const isPending = mutation.isPending || Boolean(isMutating);
  return { ...mutation, isPending };
};
