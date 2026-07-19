/**
 * Light error-reporter bridge — deliberately imports NO SDK.
 *
 * The React error boundaries (`app/app.tsx`, `app/router.tsx`) forward caught errors here
 * instead of importing Sentry directly. That keeps `@sentry/react` out of the main bundle's
 * import graph: only the dynamically-imported observability module registers a handler, so
 * the SDK loads lazily and never ships to the msw/test build.
 *
 * `reportError` is a no-op until `initSentry` (or any future reporter) calls
 * `setErrorReporter`. Errors thrown before that window are intentionally not captured — see
 * the boot-window note in the observability module.
 */
type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;

let reporter: ErrorReporter | null = null;

export function setErrorReporter(next: ErrorReporter | null): void {
  reporter = next;
}

export const reportError: ErrorReporter = (error, context) => {
  reporter?.(error, context);
};
