import type { Session, User } from '@supabase/supabase-js';

import type { UserRow } from '~/mocks/fixtures/row-types';

/**
 * Synthesize the Session/User supabase-js stores after a sign-in, so the SDK treats a
 * mock login exactly like a real one — persists it, emits `SIGNED_IN`, and the auth
 * store reacts through `onAuthStateChange` with no app-side changes.
 *
 * The access token is a real, unsigned JWT: the client only DECODES it (for `sub` and
 * expiry), never verifies the signature, so a well-formed three-part token with the
 * right claims is indistinguishable from a GoTrue-issued one on the client.
 */

const ONE_HOUR_SECONDS = 3600;

// The user id is encoded into the refresh token so a refresh-grant request can rebuild
// the same user's session without any server-side session store.
const REFRESH_PREFIX = 'msw-refresh-';

// UTF-8-safe base64url: a JWT claim carries the user email, which may hold non-Latin1
// characters that bare `btoa` throws on. Encode through TextEncoder so any email is safe.
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
  // The signature segment is a fixed marker — present so the token parses as a JWT, but
  // meaningless because nothing on the client checks it.
  return `${header}.${body}.msw-unsigned`;
}

/** Read the `sub` (user id) out of an access token, for the `/auth/v1/user` lookup. */
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

/** The subset of a user needed to mint a session — a fixture row, or a fresh sign-up
 *  where `full_name` may be absent. */
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
