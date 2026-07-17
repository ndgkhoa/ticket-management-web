import { http, HttpResponse } from 'msw';

import {
  DEMO_PASSWORD,
  permissionRows,
  roleIdByName,
  rolePermissionRows,
  roleRows,
  userRoleRows,
  userRows,
} from '~/mocks/fixtures';
import {
  buildSession,
  buildUser,
  decodeUserId,
  userIdFromRefreshToken,
} from '~/mocks/lib/fake-session';
import { parsePostgrestRequest } from '~/mocks/lib/postgrest-request';

/**
 * The auth half of the mock backend: enough of GoTrue for the demo build to sign in with
 * no live Supabase behind it. Only the flows the app uses are here — password sign-in,
 * sign-up, sign-out, the silent token refresh, and the `getUser` lookup.
 *
 * OAuth is deliberately absent: `signInWithOAuth` is a full-page redirect across origins,
 * outside a Service Worker's reach, so it cannot be mocked. In msw mode the Google button
 * short-circuits to a demo sign-in instead of starting a flow that cannot complete.
 */

const permissionCodeById = new Map(permissionRows.map((row) => [row.id, row.code]));

type DemoAccount = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

/**
 * Accounts created via sign-up this session. They have no fixture row, so without this
 * the background token refresh (`autoRefreshToken`) and any `getUser` would fail against
 * `userRows` and silently sign the visitor out after the token's first hour. In-memory
 * only — a reload starts fresh, which is correct for a stateless demo.
 */
const signedUpAccounts = new Map<string, DemoAccount>();

function findAccount(id: string | null | undefined): DemoAccount | undefined {
  if (!id) return undefined;
  return userRows.find((user) => user.id === id) ?? signedUpAccounts.get(id);
}

const invalidCredentials = () =>
  HttpResponse.json(
    {
      error: 'invalid_grant',
      error_description: 'Invalid login credentials',
      code: 'invalid_credentials',
      msg: 'Invalid login credentials',
      message: 'Invalid login credentials',
    },
    { status: 400 }
  );

async function handleToken({ request }: { request: Request }) {
  const grantType = new URL(request.url).searchParams.get('grant_type');
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (grantType === 'refresh_token') {
    const row = findAccount(userIdFromRefreshToken(String(body.refresh_token ?? '')));
    return row ? HttpResponse.json(buildSession(row)) : invalidCredentials();
  }

  // Default + `grant_type=password`: match a seeded account against the shared demo
  // password. Anything else is a failed sign-in, same as the live project would answer.
  const email = String(body.email ?? '').toLowerCase();
  const row = userRows.find((user) => user.email.toLowerCase() === email);
  if (!row || body.password !== DEMO_PASSWORD) return invalidCredentials();
  return HttpResponse.json(buildSession(row));
}

async function handleSignUp({ request }: { request: Request }) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    data?: { full_name?: string };
  };
  // A fresh account with no fixture rows behind it: the permission query below has no
  // `user_roles` for this id and falls back to the customer role, which is exactly what
  // a real new sign-up gets. Enough to land in the app as a customer.
  const row: DemoAccount = {
    id: crypto.randomUUID(),
    email: body.email ?? 'new-user@demo.local',
    full_name: body.data?.full_name ?? null,
    avatar_url: null,
  };
  // Remember it so the later refresh/getUser calls resolve, not just this first session.
  signedUpAccounts.set(row.id, row);
  return HttpResponse.json(buildSession(row));
}

function handleGetUser({ request }: { request: Request }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const row = findAccount(decodeUserId(token));
  if (!row) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return HttpResponse.json(buildUser(row));
}

/**
 * The one nested read the app makes: the permission set, flattened from
 * `user_roles → roles → role_permissions → permissions.code`. Answered directly in the
 * shape the auth store reads, since the generic table handler only does flat columns.
 *
 * A user id with no `user_roles` rows (a fresh sign-up) resolves to the customer role,
 * so a just-registered account still gets its baseline permissions.
 */
function handlePermissionQuery({ request }: { request: Request }) {
  const userId = parsePostgrestRequest(request).filters.user_id?.value;
  const roleIds = userRoleRows
    .filter((userRole) => userRole.user_id === userId)
    .map((userRole) => userRole.role_id);
  const effectiveRoleIds = roleIds.length > 0 ? roleIds : [roleIdByName.get('customer')!];

  const data = effectiveRoleIds.map((roleId) => ({
    roles: {
      id: roleId,
      name: roleRows.find((role) => role.id === roleId)?.name ?? '',
      role_permissions: rolePermissionRows
        .filter((rolePermission) => rolePermission.role_id === roleId)
        .map((rolePermission) => ({
          permissions: { code: permissionCodeById.get(rolePermission.permission_id) ?? '' },
        })),
    },
  }));

  return HttpResponse.json(data);
}

export const authHandlers = [
  http.post('*/auth/v1/token', handleToken),
  http.post('*/auth/v1/signup', handleSignUp),
  http.get('*/auth/v1/user', handleGetUser),
  http.post('*/auth/v1/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('*/rest/v1/user_roles', handlePermissionQuery),
];
