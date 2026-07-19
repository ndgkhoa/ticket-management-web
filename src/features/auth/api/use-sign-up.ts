import { useMutation } from '@tanstack/react-query';

import { authApi } from '~/features/auth/api/auth-api';

/**
 * Email/password sign-up as a mutation. Like `useSignIn`, it only surfaces the SDK
 * result — the caller decides what to do with the returned `session` (present when the
 * project auto-confirms email → navigate; null when confirmation is required → prompt
 * the user to check their inbox). The SDK returns `{ data, error }` rather than
 * throwing, so the mutationFn rethrows to put React Query on its error path.
 */
export const useSignUp = () =>
  useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
      fullName: string;
      captchaToken?: string;
    }) => {
      const { data, error } = await authApi.signUp(
        credentials.email,
        credentials.password,
        credentials.fullName,
        credentials.captchaToken
      );
      if (error) throw error;
      return data;
    },
  });
