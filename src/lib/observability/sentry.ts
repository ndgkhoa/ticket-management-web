import * as Sentry from '@sentry/react';

import { scrubSentryEvent, scrubSentryBreadcrumb } from './pii-scrub';
import { setErrorReporter } from './reporter';

/**
 * Initialise Sentry error monitoring. Called only from the dynamically-imported observability
 * entry, so `@sentry/react` never enters the main bundle or the msw/test path.
 *
 * `sendDefaultPii: false` and the allowlist scrubbers below keep free-text ticket content,
 * PostgREST query filters, and record UUIDs from leaving the client. Tracing is off (pure
 * error monitoring, YAGNI) — raise `tracesSampleRate` later if performance data is wanted.
 */
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

  // Route the error boundaries' forwarded errors into Sentry. Until this runs, `reportError`
  // is a no-op — errors thrown before init are intentionally not captured (see reporter.ts).
  setErrorReporter((error) => Sentry.captureException(error));
}

/** Identify the signed-in user by id ONLY — never email or any other PII. */
export function setSentryUser(id: string | null): void {
  Sentry.setUser(id ? { id } : null);
}
