import type { Session, User } from '@supabase/supabase-js';

import type { UserRow } from '~/mocks/fixtures/row-types';

const ONE_HOUR_SECONDS = 3600;

const REFRESH_PREFIX = 'msw-refresh-';

function base64UrlEncode(input: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(input)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const binary = atob(input.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function encodeJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.msw-unsigned`;
}

export function decodeUserId(accessToken: string): string | null {
  const [, body] = accessToken.split('.');
  if (!body) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(body)) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

export function refreshTokenFor(userId: string): string {
  return `${REFRESH_PREFIX}${userId}`;
}

export function userIdFromRefreshToken(refreshToken: string): string | null {
  return refreshToken.startsWith(REFRESH_PREFIX) ? refreshToken.slice(REFRESH_PREFIX.length) : null;
}

type SessionUser = Pick<UserRow, 'id' | 'email'> & {
  full_name: string | null;
  avatar_url: string | null;
};

export function buildUser(row: SessionUser): User {
  return {
    id: row.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: row.email,
    email_confirmed_at: new Date(0).toISOString(),
    phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: row.full_name, avatar_url: row.avatar_url },
    identities: [],
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  } as User;
}

export function buildSession(row: SessionUser): Session {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ONE_HOUR_SECONDS;

  return {
    access_token: encodeJwt({
      sub: row.id,
      email: row.email,
      role: 'authenticated',
      aud: 'authenticated',
      iat: issuedAt,
      exp: expiresAt,
    }),
    token_type: 'bearer',
    expires_in: ONE_HOUR_SECONDS,
    expires_at: expiresAt,
    refresh_token: refreshTokenFor(row.id),
    user: buildUser(row),
  };
}
