import { useMutation } from '@tanstack/react-query';

import { authApi } from '~/features/auth/api/auth-api';

/**
 * Email/password sign-in as a mutation.
 *
 * On success there is nothing to set here — the SDK emits `SIGNED_IN`, the auth store
 * picks it up through `onAuthStateChange`, and the guard reacts. The component only
 * needs `isPending` for the button and `mutate`'s `onError` for the toast, so this
 * hook exposes the mutation and lets the caller drive navigation.
 *
 * The SDK returns `{ data, error }` rather than throwing, so the mutationFn rethrows
 * the error to put React Query on its error path.
 */
export const useSignIn = () =>
  useMutation({
    mutationFn: async (credentials: { email: string; password: string; captchaToken?: string }) => {
      const { data, error } = await authApi.signInWithPassword(
        credentials.email,
        credentials.password,
        credentials.captchaToken
      );
      if (error) throw error;
      return data;
    },
  });
