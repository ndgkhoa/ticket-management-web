import { redirect } from '@tanstack/react-router';

import { useAuthStore } from '~/stores/auth';

/**
 * `beforeLoad` guards.
 *
 * They read the auth store non-reactively (`getState`) because `beforeLoad` runs
 * outside React. The store's `status` is never `loading` here: `app/provider.tsx`
 * withholds the `RouterProvider` until the initial session has resolved, so a guard
 * only ever sees `authenticated` or `unauthenticated` and never bounces a signed-in
 * user for the frame before their session loads.
 */

/** Require a session. Redirects to sign-in, preserving where the user was headed. */
export function requireAuth(pathname: string) {
  if (useAuthStore.getState().status !== 'authenticated') {
    throw redirect({ to: '/auth/sign-in', search: { redirect: pathname } });
  }
}

/** Keep an already-signed-in user out of the auth screens. */
export function redirectIfAuthenticated() {
  if (useAuthStore.getState().status === 'authenticated') {
    throw redirect({ to: '/' });
  }
}

/**
 * Require a permission code. For an authenticated user who lacks it, redirect home
 * rather than to sign-in — they are logged in, just not entitled to this area. The
 * permission set is already loaded by the time any guard runs (see the auth store),
 * so this reads it synchronously. RLS is the real enforcement; this guard is the
 * early, friendly redirect that keeps an unauthorised screen from ever rendering.
 */
export function requirePermission(code: string) {
  if (!useAuthStore.getState().hasPermission(code)) {
    throw redirect({ to: '/' });
  }
}
