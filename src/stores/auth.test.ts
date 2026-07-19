import { afterEach, describe, expect, it } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';

/**
 * The auth store's synchronous core: applying a session flips status + exposes the flattened
 * permission set that `hasPermission` (and the route guards) read.
 */
describe('auth store', () => {
  afterEach(() =>
    useAuthStore.setState({ session: null, user: null, status: 'loading', permissions: new Set() })
  );

  it('applies a session and answers hasPermission from the set', () => {
    const session = { user: { id: 'u1' } } as unknown as Session;
    useAuthStore.getState().applySession(session, new Set(['ticket.update', 'canned.read']));

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe('u1');
    expect(state.status).toBe('authenticated');
    expect(state.hasPermission('ticket.update')).toBe(true);
    expect(state.hasPermission('nope')).toBe(false);
  });

  it('resolves to unauthenticated on a null session', () => {
    useAuthStore.getState().applySession(null, new Set());

    const state = useAuthStore.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.hasPermission('ticket.update')).toBe(false);
  });
});
