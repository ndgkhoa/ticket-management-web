import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '~/lib/supabase';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthStore = {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
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
    await supabase.auth.signOut();
  },
}));

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

async function resolveSession(session: Session | null) {
  if (!session) {
    useAuthStore.getState().applySession(null, new Set());
    return;
  }

  try {
    const permissions = await fetchPermissions(session.user.id);
    useAuthStore.getState().applySession(session, permissions);
  } catch {
    const prev = useAuthStore.getState();
    const keptPermissions =
      prev.user?.id === session.user.id ? prev.permissions : new Set<string>();
    useAuthStore.getState().applySession(session, keptPermissions);
  }
}

export function subscribeToAuth() {
  supabase.auth
    .getSession()
    .then(({ data }) => resolveSession(data.session))
    .catch(() => resolveSession(null));

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void resolveSession(session);
  });

  return () => data.subscription.unsubscribe();
}
