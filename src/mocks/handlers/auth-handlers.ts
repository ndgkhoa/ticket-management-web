import { http, HttpResponse } from 'msw';

import { DEMO_PASSWORD, userRows } from '~/mocks/fixtures';
import {
  buildSession,
  buildUser,
  decodeUserId,
  userIdFromRefreshToken,
} from '~/mocks/lib/fake-session';

type DemoAccount = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};

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
  const row: DemoAccount = {
    id: crypto.randomUUID(),
    email: body.email ?? 'new-user@example.com',
    full_name: body.data?.full_name ?? null,
    avatar_url: null,
  };
  signedUpAccounts.set(row.id, row);
  return HttpResponse.json(buildSession(row));
}

function handleGetUser({ request }: { request: Request }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const row = findAccount(decodeUserId(token));
  if (!row) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return HttpResponse.json(buildUser(row));
}

export const authHandlers = [
  http.post('*/auth/v1/token', handleToken),
  http.post('*/auth/v1/signup', handleSignUp),
  http.get('*/auth/v1/user', handleGetUser),
  http.post('*/auth/v1/logout', () => new HttpResponse(null, { status: 204 })),
];
