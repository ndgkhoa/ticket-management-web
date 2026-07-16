import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '~/lib/supabase';

/**
 * Reactive auth state, derived from the Supabase session.
 *
 * The SDK owns the session — it persists it, refreshes the token in the background,
 * and is the single source of truth. This store does NOT duplicate that; it mirrors
 * the SDK's `onAuthStateChange` so the UI and route guards have something reactive to
 * read. That is why there is no `persist` middleware and no token field: the previous
 * store hand-rolled `AccessToken`/`RefreshToken` in localStorage and had to clear
 * them on logout (and forgot to), which is exactly the class of bug the SDK removes.
 *
 * `status` starts at `loading` so a guard can show a spinner rather than briefly
 * bouncing a signed-in user to the login screen before the persisted session
 * resolves — the flash-of-unauthenticated problem.
 */
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthStore = {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  status: 'loading',
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? 'authenticated' : 'unauthenticated',
    }),
  signOut: async () => {
    // Sign out through the SDK; the `onAuthStateChange` listener below sees
    // SIGNED_OUT and sets the store to unauthenticated. No manual state clear, so
    // there is no second copy to forget.
    await supabase.auth.signOut();
  },
}));

/**
 * Wire the store to the SDK. Called once from the app provider.
 *
 * `getSession` resolves the persisted session on boot (moving `status` off
 * `loading`); `onAuthStateChange` then keeps the store in step with every sign-in,
 * sign-out and silent token refresh. Returns the unsubscribe for effect cleanup.
 */
export function subscribeToAuth() {
  supabase.auth
    .getSession()
    .then(({ data }) => useAuthStore.getState().setSession(data.session))
    // If the initial read ever rejects, resolve to unauthenticated rather than
    // leaving `status` stuck on `loading` — an infinite spinner behind the guard.
    // `onAuthStateChange` also fires INITIAL_SESSION, but relying on that alone
    // leaves this guarantee implicit.
    .catch(() => useAuthStore.getState().setSession(null));

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return () => data.subscription.unsubscribe();
}
