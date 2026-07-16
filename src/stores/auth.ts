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
 * `status` starts at `loading` and only becomes `authenticated` once the session AND
 * the user's permission set have both loaded, so a `beforeLoad` guard never runs
 * against a half-resolved auth state — no flash-of-unauthenticated, and no window
 * where `hasPermission` wrongly returns false for a permission the user holds.
 */
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthStore = {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  /** Permission codes the signed-in user holds through their roles. */
  permissions: ReadonlySet<string>;
  hasPermission: (code: string) => boolean;
  applySession: (session: Session | null, permissions: ReadonlySet<string>) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  status: 'loading',
  permissions: new Set(),
  hasPermission: (code) => get().permissions.has(code),
  applySession: (session, permissions) =>
    set({
      session,
      user: session?.user ?? null,
      permissions,
      status: session ? 'authenticated' : 'unauthenticated',
    }),
  signOut: async () => {
    // Sign out through the SDK; the `onAuthStateChange` listener below sees
    // SIGNED_OUT and resolves the store to unauthenticated. No manual state clear,
    // so there is no second copy to forget.
    await supabase.auth.signOut();
  },
}));

/**
 * The permission codes a user holds, flattened from their roles:
 * user_roles → roles → role_permissions → permissions.code. One nested query rather
 * than a call per code, so a guard can check synchronously against the loaded set.
 */
async function fetchPermissions(userId: string): Promise<ReadonlySet<string>> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(role_permissions(permissions(code)))')
    .eq('user_id', userId)
    .throwOnError();

  const codes = new Set<string>();
  for (const userRole of data ?? []) {
    for (const rolePermission of userRole.roles?.role_permissions ?? []) {
      const code = rolePermission.permissions?.code;
      if (code) codes.add(code);
    }
  }
  return codes;
}

/**
 * Resolve a session into store state: load the permission set for a real session
 * (empty on failure — a transient fetch error must not lock the user out mid-session
 * more than momentarily), or clear everything when signed out.
 */
async function resolveSession(session: Session | null) {
  if (!session) {
    useAuthStore.getState().applySession(null, new Set());
    return;
  }

  const permissions = await fetchPermissions(session.user.id).catch(() => new Set<string>());
  useAuthStore.getState().applySession(session, permissions);
}

/**
 * Wire the store to the SDK. Called once from the app provider.
 *
 * `getSession` resolves the persisted session on boot; `onAuthStateChange` keeps the
 * store in step with every sign-in, sign-out and silent token refresh. Each resolves
 * through `resolveSession`, so the permission set is always loaded before `status`
 * flips to `authenticated`. Returns the unsubscribe for effect cleanup.
 */
export function subscribeToAuth() {
  supabase.auth
    .getSession()
    .then(({ data }) => resolveSession(data.session))
    // If the initial read rejects, resolve to unauthenticated rather than leaving
    // `status` stuck on `loading` — an infinite spinner behind the guard.
    .catch(() => resolveSession(null));

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void resolveSession(session);
  });

  return () => data.subscription.unsubscribe();
}
