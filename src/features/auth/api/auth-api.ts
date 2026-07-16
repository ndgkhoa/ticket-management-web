import { supabase } from '~/lib/supabase';

/**
 * Auth operations, thin wrappers over the Supabase SDK.
 *
 * Sign-in is email/password (Supabase has no username concept) plus Google OAuth.
 * The session that results is owned by the SDK and observed by the auth store — none
 * of these functions touch app state directly, so there is one path in and one
 * source of truth.
 */
export const authApi = {
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      // Return to the app root after the provider round-trip; the SDK reads the
      // session back out of the URL (`detectSessionInUrl`).
      options: { redirectTo: `${window.location.origin}/` },
    }),

  signOut: () => supabase.auth.signOut(),
};
