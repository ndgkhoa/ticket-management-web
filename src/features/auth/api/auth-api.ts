import { supabase } from '~/lib/supabase';

/**
 * Sign-in operations, thin wrappers over the Supabase SDK.
 *
 * Sign-in is email/password (Supabase has no username concept) plus Google OAuth.
 * The resulting session is owned by the SDK and observed by the auth store — these
 * functions never touch app state directly. Sign-OUT lives on the store, since it is
 * a state transition the store already owns; duplicating it here would give two paths
 * for one operation.
 *
 * `signInWithGoogle` is the OAuth entry point the login button wires up in the UI
 * phase; local Supabase has no Google provider configured, so the button shows
 * "coming soon" until then rather than redirecting into a dead flow.
 */
export const authApi = {
  signInWithPassword: (email: string, password: string, captchaToken?: string) =>
    supabase.auth.signInWithPassword({ email, password, options: { captchaToken } }),

  /**
   * Email/password sign-up. `full_name` rides in `options.data` (user metadata); the
   * DB trigger on `auth.users` copies it onto the new `profiles` row, so the app never
   * writes the profile itself. Whether a session comes back depends on the project's
   * email-confirmation setting — the caller handles both (navigate vs "check your inbox").
   */
  signUp: (email: string, password: string, fullName: string, captchaToken?: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, captchaToken },
    }),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      // Return to the app root after the provider round-trip; the SDK reads the
      // session back out of the URL (`detectSessionInUrl`).
      options: { redirectTo: `${window.location.origin}/` },
    }),
};
