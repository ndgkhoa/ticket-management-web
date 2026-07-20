import { supabase } from '~/lib/supabase';

export const authApi = {
  signInWithPassword: (email: string, password: string, captchaToken?: string) =>
    supabase.auth.signInWithPassword({ email, password, options: { captchaToken } }),

  signUp: (email: string, password: string, fullName: string, captchaToken?: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, captchaToken },
    }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    }),
};
