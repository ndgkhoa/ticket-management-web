import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import type * as AuthModule from '~/stores/auth';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  throwOnError: vi.fn(),
}));

vi.mock('~/lib/supabase', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    throwOnError: () => mocks.throwOnError(),
  };
  return {
    supabase: {
      auth: {
        getSession: () => mocks.getSession(),
        onAuthStateChange: (callback: unknown) => mocks.onAuthStateChange(callback),
        signOut: () => mocks.signOut(),
      },
      from: () => builder,
    },
  };
});

let store: typeof AuthModule;

const sessionFor = (userId: string) => ({ user: { id: userId } }) as unknown as Session;

const permissionRows = (...codes: string[]) => ({
  data: [{ roles: { role_permissions: codes.map((code) => ({ permissions: { code } })) } }],
});

const emitAuthChange = (session: Session | null) => {
  const callback = mocks.onAuthStateChange.mock.calls.at(-1)?.[0] as (
    event: string,
    session: Session | null
  ) => void;
  callback('SIGNED_IN', session);
};

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mocks.unsubscribe } },
  });
  mocks.throwOnError.mockResolvedValue({ data: [] });

  vi.resetModules();
  store = await import('~/stores/auth');
});

describe('useAuthStore', () => {
  it('applies a session and answers hasPermission from the set', () => {
    const session = { user: { id: 'u1' } } as unknown as Session;
    store.useAuthStore.getState().applySession(session, new Set(['ticket.update', 'canned.read']));

    const state = store.useAuthStore.getState();
    expect(state.user?.id).toBe('u1');
    expect(state.status).toBe('authenticated');
    expect(state.hasPermission('ticket.update')).toBe(true);
    expect(state.hasPermission('nope')).toBe(false);
  });

  it('resolves to unauthenticated on a null session', () => {
    store.useAuthStore.getState().applySession(null, new Set());

    const state = store.useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.hasPermission('ticket.update')).toBe(false);
  });

  it('signs out through supabase', async () => {
    mocks.signOut.mockResolvedValue({ error: null });

    await store.useAuthStore.getState().signOut();

    expect(mocks.signOut).toHaveBeenCalled();
  });
});

describe('subscribeToAuth', () => {
  it('flattens the nested role rows into a permission set', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: sessionFor('u1') } });
    mocks.throwOnError.mockResolvedValue(permissionRows('ticket.update', 'ticket.read'));

    store.subscribeToAuth();

    await vi.waitFor(() => expect(store.useAuthStore.getState().status).toBe('authenticated'));
    const state = store.useAuthStore.getState();
    expect(state.user?.id).toBe('u1');
    expect([...state.permissions].sort()).toEqual(['ticket.read', 'ticket.update']);
  });

  it('skips role rows that carry no permission code', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: sessionFor('u1') } });
    mocks.throwOnError.mockResolvedValue({
      data: [{ roles: { role_permissions: [{ permissions: null }] } }, { roles: null }],
    });

    store.subscribeToAuth();

    await vi.waitFor(() => expect(store.useAuthStore.getState().status).toBe('authenticated'));
    expect([...store.useAuthStore.getState().permissions]).toEqual([]);
  });

  it('still authenticates when the permission lookup fails', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: sessionFor('u1') } });
    mocks.throwOnError.mockRejectedValue(new Error('network down'));

    store.subscribeToAuth();

    await vi.waitFor(() => expect(store.useAuthStore.getState().status).toBe('authenticated'));
    expect([...store.useAuthStore.getState().permissions]).toEqual([]);
  });

  it('keeps the permissions already held when a refetch fails for the same user', async () => {
    store.useAuthStore.getState().applySession(sessionFor('u1'), new Set(['ticket.update']));
    mocks.getSession.mockResolvedValue({ data: { session: sessionFor('u1') } });
    mocks.throwOnError.mockRejectedValue(new Error('network down'));

    store.subscribeToAuth();

    await vi.waitFor(() => expect(mocks.throwOnError).toHaveBeenCalled());
    expect([...store.useAuthStore.getState().permissions]).toEqual(['ticket.update']);
  });

  it('drops the permissions when a failed refetch belongs to a different user', async () => {
    store.useAuthStore.getState().applySession(sessionFor('u1'), new Set(['ticket.update']));
    mocks.getSession.mockResolvedValue({ data: { session: sessionFor('u2') } });
    mocks.throwOnError.mockRejectedValue(new Error('network down'));

    store.subscribeToAuth();

    await vi.waitFor(() => expect(store.useAuthStore.getState().user?.id).toBe('u2'));
    expect([...store.useAuthStore.getState().permissions]).toEqual([]);
  });

  it('falls back to signed out when the initial session lookup rejects', async () => {
    mocks.getSession.mockRejectedValue(new Error('offline'));

    store.subscribeToAuth();

    await vi.waitFor(() => expect(store.useAuthStore.getState().status).toBe('unauthenticated'));
    expect(mocks.throwOnError).not.toHaveBeenCalled();
  });

  it('re-resolves the session on every auth state change', async () => {
    store.subscribeToAuth();
    mocks.throwOnError.mockResolvedValue(permissionRows('ticket.read'));

    emitAuthChange(sessionFor('u3'));

    await vi.waitFor(() => expect(store.useAuthStore.getState().user?.id).toBe('u3'));
    expect([...store.useAuthStore.getState().permissions]).toEqual(['ticket.read']);
  });

  it('signs out the store when the auth state change carries no session', async () => {
    store.useAuthStore.getState().applySession(sessionFor('u1'), new Set(['ticket.update']));
    store.subscribeToAuth();

    emitAuthChange(null);

    await vi.waitFor(() => expect(store.useAuthStore.getState().status).toBe('unauthenticated'));
    expect([...store.useAuthStore.getState().permissions]).toEqual([]);
  });

  it('unsubscribes the listener through the returned cleanup', () => {
    store.subscribeToAuth()();

    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
});
