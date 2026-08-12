import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { env } from '~/config/env';
import '~/i18n';
import App from '~/app/app';
import '~/styles/index.css';

const enableMocking = async () => {
  if (env.VITE_API_MODE !== 'msw') return;

  const { worker } = await import('~/mocks/browser');
  await worker.start({ onUnhandledRequest: 'warn' });

  const { installMockRealtime } = await import('~/mocks/lib/realtime-bus');
  installMockRealtime();
};

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
