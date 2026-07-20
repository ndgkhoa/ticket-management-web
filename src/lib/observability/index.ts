import { env } from '~/config/env';
import { useAuthStore } from '~/stores/auth';

export async function initObservability(): Promise<void> {
  let setSentryUser: ((id: string | null) => void) | undefined;
  let identifyUser: ((id: string) => void) | undefined;
  let resetUser: (() => void) | undefined;

  if (env.VITE_SENTRY_DSN) {
    try {
      const sentry = await import('./sentry');
      sentry.initSentry(env.VITE_SENTRY_DSN);
      setSentryUser = sentry.setSentryUser;
    } catch (error) {
      console.error('[observability] Sentry init failed', error);
    }
  }

  if (env.VITE_POSTHOG_KEY) {
    try {
      const ph = await import('./posthog');
      ph.initPostHog(env.VITE_POSTHOG_KEY, env.VITE_POSTHOG_HOST);
      identifyUser = ph.identifyUser;
      resetUser = ph.resetUser;
    } catch (error) {
      console.error('[observability] PostHog init failed', error);
    }
  }

  let lastId: string | undefined;
  const sync = (user: { id: string } | null) => {
    if (user?.id === lastId) return;
    const previousId = lastId;
    lastId = user?.id;
    setSentryUser?.(user?.id ?? null);
    if (user) {
      if (previousId && previousId !== user.id) resetUser?.();
      identifyUser?.(user.id);
    } else {
      resetUser?.();
    }
  };

  sync(useAuthStore.getState().user);
  useAuthStore.subscribe((state) => sync(state.user));
}
