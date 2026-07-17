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
};

/**
 * `finally`, never `then`. The mock API failing — worker 404, insecure origin, service
 * workers disabled — must not take the app down with it: a rejected promise here would
 * skip render() entirely and leave a blank page with nothing in the UI to explain it.
 * Rendering is unconditional; only the mocking is best-effort.
 */
enableMocking()
  .catch((error: unknown) => {
    console.error('[msw] mock API failed to start; continuing against the real API', error);
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
