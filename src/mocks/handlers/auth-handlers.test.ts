import { describe, expect, it } from 'vitest';

import { supabase } from '~/lib/supabase';
import { authApi } from '~/features/auth/api/auth-api';
import { DEMO_LOGIN } from '~/features/auth/constants/demo-login';
import { DEMO_PASSWORD, demoUserByRole } from '~/mocks/fixtures';

/**
 * The mock GoTrue: enough of auth for the static demo to sign in with no live Supabase.
 * Sign-in must round-trip a session the SDK accepts, and the nested permission query the
 * auth store runs must resolve to each role's real permission set.
 */

describe('password sign-in over MSW', () => {
  it('returns a session for a seeded account', async () => {
    const { data, error } = await authApi.signInWithPassword('owner@example.com', 'password123');

    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    expect(data.user?.email).toBe('owner@example.com');
  });

  it('rejects a wrong password', async () => {
    const { error } = await authApi.signInWithPassword('owner@example.com', 'wrong');

    expect(error).not.toBeNull();
  });

  it('keeps the Google-button demo credentials valid against the fixtures', async () => {
    // The msw Google shortcut can't import from `~/mocks`, so DEMO_LOGIN duplicates the
    // fixture password/owner email. Pin them here so drift fails a test, not the demo.
    expect(DEMO_LOGIN.password).toBe(DEMO_PASSWORD);
    expect(DEMO_LOGIN.email).toBe(demoUserByRole.get('owner')!.email);

    const { error } = await authApi.signInWithPassword(DEMO_LOGIN.email, DEMO_LOGIN.password);
    expect(error).toBeNull();
  });
});

/** Mirrors the store's `fetchPermissions` query so the assertion tracks real app usage. */
async function permissionCodesFor(userId: string): Promise<Set<string>> {
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

describe('permission query over MSW', () => {
  it('grants the owner the catalogue permission', async () => {
    const codes = await permissionCodesFor(demoUserByRole.get('owner')!.id);

    expect(codes.has('permission.manage')).toBe(true);
  });

  it('scopes a customer to opening tickets only', async () => {
    const codes = await permissionCodesFor(demoUserByRole.get('customer')!.id);

    expect([...codes]).toEqual(['ticket.create']);
  });

  it('withholds the full user list from an agent', async () => {
    const codes = await permissionCodesFor(demoUserByRole.get('agent')!.id);

    expect(codes.has('user.read.all')).toBe(false);
    expect(codes.has('ticket.read.team')).toBe(true);
  });
});
