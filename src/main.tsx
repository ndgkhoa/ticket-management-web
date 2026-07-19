import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { env } from '~/config/env';
// Initialise i18next before the first render. This previously happened only as a
// side effect of the preferences store importing it — a transitive import any
// refactor could quietly break, leaving the UI to render raw keys.
import '~/i18n';
import App from '~/app/app';
import '~/styles/index.css';

/**
 * Start the mock API before the first render, never alongside it.
 *
 * `worker.start()` resolves once the Service Worker controls the page; rendering
 * before that lets the first requests race past MSW to the network, which shows up
 * as a demo that works on reload but not on first load.
 *
 * The import is dynamic so MSW stays out of the bundle entirely when the app is
 * built against a live API.
 */
const enableMocking = async () => {
  if (env.VITE_API_MODE !== 'msw') return;

  const { worker } = await import('~/mocks/browser');
  // 'warn' rather than 'bypass': an unhandled request still reaches the network, but
  // it says so. Silence here means a missing handler looks like a backend problem.
  await worker.start({ onUnhandledRequest: 'warn' });

  // Route realtime through the BroadcastChannel mock (dynamic import keeps it, and its
  // fixtures, out of the live bundle) and start the synthetic "other users" activity.
  const { installMockRealtime } = await import('~/mocks/lib/realtime-bus');
  installMockRealtime();
};

/**
 * Load and start observability (Sentry + PostHog) only when it's actually configured: never in
 * `msw` mode (tests/demo) and never when both keys are unset. The import is dynamic so the SDKs
 * stay out of the main bundle and never load in those cases. Own catch so an init failure logs
 * as observability, not as an MSW problem, and never blocks render.
 */
const observabilityEnabled =
  env.VITE_API_MODE === 'supabase' && Boolean(env.VITE_SENTRY_DSN || env.VITE_POSTHOG_KEY);

const startObservability = () =>
  observabilityEnabled
    ? import('~/lib/observability')
        .then((module) => module.initObservability())
        .catch((error: unknown) => {
          console.error('[observability] init failed; app continues', error);
        })
    : Promise.resolve();

/**
 * `finally`, never `then`. The mock API or observability failing — worker 404, insecure origin,
 * service workers disabled, a bad DSN — must not take the app down with it: a rejected promise
 * here would skip render() entirely and leave a blank page with nothing in the UI to explain it.
 * Rendering is unconditional; only mocking and observability are best-effort.
 */
enableMocking()
  .catch((error: unknown) => {
    console.error('[msw] mock API failed to start; continuing against the real API', error);
  })
  .then(startObservability)
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
