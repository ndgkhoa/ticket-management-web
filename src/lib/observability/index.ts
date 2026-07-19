import { env } from '~/config/env';
import { useAuthStore } from '~/stores/auth';

/**
 * Boot whichever telemetry SDKs are configured, then keep their user context in sync with the
 * auth store. This is the ONLY module that imports the SDKs, and it is itself only ever
 * dynamically imported from `main.tsx` — that is what keeps `@sentry/react` and `posthog-js`
 * out of the main bundle and the msw/test path.
 *
 * Each SDK is initialised in its own try/catch: a chunk that fails to load (e.g. a stale
 * `index.html` referencing a new hashed chunk after a redeploy) must not prevent the other
 * SDK — or its error reporter — from coming up.
 */
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

  // Sync user context on real id transitions only. The store's listener fires on every `set()`
  // — including the ~hourly silent token refresh and permission reloads — so dedupe on the id
  // to avoid re-identifying with an unchanged value.
  let lastId: string | undefined;
  const sync = (user: { id: string } | null) => {
    if (user?.id === lastId) return;
    const previousId = lastId;
    lastId = user?.id;
    setSentryUser?.(user?.id ?? null);
    if (user) {
      // Switching directly from one account to another (a cross-tab sign-in with no
      // intervening sign-out) must reset first, or PostHog would merge B into A's distinct_id.
      if (previousId && previousId !== user.id) resetUser?.();
      identifyUser?.(user.id);
    } else {
      resetUser?.();
    }
  };

  // Usually null at boot (status starts 'loading', and the auth listener is wired later in the
  // App effect); the subscription below catches the first real session.
  sync(useAuthStore.getState().user);
  useAuthStore.subscribe((state) => sync(state.user));
}
