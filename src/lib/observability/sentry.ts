import * as Sentry from '@sentry/react';

import { scrubSentryEvent, scrubSentryBreadcrumb } from './pii-scrub';
import { setErrorReporter } from './reporter';

export function initSentry(dsn: string): void {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => {
      scrubSentryEvent(event);
      return event;
    },
    beforeBreadcrumb: (crumb) => {
      scrubSentryBreadcrumb(crumb);
      return crumb;
    },
  });

  setErrorReporter((error) => Sentry.captureException(error));
}

export function setSentryUser(id: string | null): void {
  Sentry.setUser(id ? { id } : null);
}
