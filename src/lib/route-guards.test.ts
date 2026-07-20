import { afterEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '~/stores/auth';
import { redirectIfAuthenticated, requireAuth, requirePermission } from '~/lib/route-guards';

describe('route guards', () => {
  afterEach(() => useAuthStore.setState({ status: 'unauthenticated', permissions: new Set() }));

  it('requireAuth redirects a guest to sign-in', () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    expect(() => requireAuth('/tickets')).toThrow();
  });

  it('requireAuth lets an authenticated user through', () => {
    useAuthStore.setState({ status: 'authenticated' });
    expect(() => requireAuth('/tickets')).not.toThrow();
  });

  it('redirectIfAuthenticated bounces a signed-in user off the auth screens', () => {
    useAuthStore.setState({ status: 'authenticated' });
    expect(() => redirectIfAuthenticated()).toThrow();
  });

  it('redirectIfAuthenticated lets a guest reach sign-in', () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    expect(() => redirectIfAuthenticated()).not.toThrow();
  });

  it('requirePermission redirects when the code is missing', () => {
    useAuthStore.setState({ status: 'authenticated', permissions: new Set() });
    expect(() => requirePermission('ticket.update')).toThrow();
  });

  it('requirePermission passes when the code is held', () => {
    useAuthStore.setState({ status: 'authenticated', permissions: new Set(['ticket.update']) });
    expect(() => requirePermission('ticket.update')).not.toThrow();
  });
});
