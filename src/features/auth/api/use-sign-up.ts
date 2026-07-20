import { useMutation } from '@tanstack/react-query';

import { authApi } from '~/features/auth/api/auth-api';

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
