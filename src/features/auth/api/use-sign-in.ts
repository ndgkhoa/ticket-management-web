import { useMutation } from '@tanstack/react-query';

import { authApi } from '~/features/auth/api/auth-api';

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
