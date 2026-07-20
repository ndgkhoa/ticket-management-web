import { redirect } from '@tanstack/react-router';

import { useAuthStore } from '~/stores/auth';

export function requireAuth(pathname: string) {
  if (useAuthStore.getState().status !== 'authenticated') {
    throw redirect({ to: '/auth/sign-in', search: { redirect: pathname } });
  }
}

export function redirectIfAuthenticated() {
  if (useAuthStore.getState().status === 'authenticated') {
    throw redirect({ to: '/' });
  }
}

export function requirePermission(code: string) {
  if (!useAuthStore.getState().hasPermission(code)) {
    throw redirect({ to: '/' });
  }
}
