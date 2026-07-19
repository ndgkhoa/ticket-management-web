/**
 * Pure PII-scrubbing helpers for Sentry + PostHog. Deliberately SDK-free so they are unit
 * testable without loading a telemetry SDK, and so the boundary is enforced by construction.
 *
 * Strategy is an ALLOWLIST, not a denylist: the app is a help desk whose primary PII is
 * free-text ticket content (subject, description, notes, customer names). None of that
 * matches an email regex, so a denylist keyed on email patterns is unsound — anything not
 * enumerated leaks. These helpers instead keep only known-safe fields and drop the rest,
 * and normalize URLs so record ids and query filters never ship.
 */

/** A path segment that identifies a record: a UUID, or a long all-digit id. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_NUMERIC_ID = /^\d{4,}$/;

/** PostHog URL-bearing property keys whose values must be normalized. */
const URL_PROPERTY_KEYS = ['$current_url', '$pathname', '$referrer', '$initial_current_url'];

/** Replace record-identifying path segments with `:id` so URLs can't be tied to a record. */
export function normalizePath(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => (UUID.test(segment) || LONG_NUMERIC_ID.test(segment) ? ':id' : segment))
    .join('/');
}

/**
 * Drop the query string (PostgREST encodes search terms + filters there) and normalize record
 * ids in the path. Keeps the origin/path shape for debugging without leaking values.
 */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return url.origin + normalizePath(url.pathname);
  } catch {
    // Relative or malformed URL: strip anything after `?` or `#` and normalize the path.
    const [path = ''] = raw.split(/[?#]/);
    return normalizePath(path);
  }
}

interface SentryEventLike {
  request?: { url?: string; query_string?: unknown };
  extra?: Record<string, unknown>;
}

/**
 * Sentry `beforeSend` scrub. Normalizes the request URL, drops the raw query string, and
 * removes `extra` entirely — free-text/ticket content is exactly what tends to land there,
 * and nothing in `extra` is on the allowlist. Mutates in place and returns the same event.
 *
 * NOTE: `event.message` and `exception.values[].value` are intentionally left intact — the
 * error text is what makes a report useful, and it cannot be allowlisted without gutting it.
 * The constraint that keeps this safe lives at the throw sites: do NOT interpolate ticket or
 * customer free-text into `Error` messages (throw a stable message, attach ids via tags).
 */
export function scrubSentryEvent(event: SentryEventLike): SentryEventLike {
  if (event.request?.url) event.request.url = normalizeUrl(event.request.url);
  if (event.request) delete event.request.query_string;
  delete event.extra;
  return event;
}

interface SentryBreadcrumbLike {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Sentry `beforeBreadcrumb` scrub. Two default breadcrumb sources leak: fetch/XHR crumbs record
 * the full request URL (PostgREST query string carries the search term + record UUIDs), and
 * `ui.*` interaction crumbs put a DOM-selector string in `message` that can embed attribute
 * values (aria-label/title/alt) holding a customer name. Normalize the URL; drop the UI selector
 * message. Mutates in place and returns the same breadcrumb.
 */
export function scrubSentryBreadcrumb(crumb: SentryBreadcrumbLike): SentryBreadcrumbLike {
  if (crumb.category?.startsWith('ui.')) delete crumb.message;
  const url = crumb.data?.url;
  if (typeof url === 'string') crumb.data = { ...crumb.data, url: normalizeUrl(url) };
  return crumb;
}

/**
 * PostHog `before_send` property scrub. Autocapture is a separate pipeline from session replay:
 * even with replay masked, autocapture attaches the interacted element's text (`$el_text`) and
 * the `$elements` chain. Normalize URL props and strip element text so ticket subjects and
 * customer names never leave the client. Returns a new object (does not mutate the input).
 */
export function sanitizePosthogProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...properties };

  for (const key of URL_PROPERTY_KEYS) {
    if (typeof out[key] === 'string') out[key] = normalizeUrl(out[key] as string);
  }

  delete out.$el_text;
  // Newer autocapture may emit a flattened selector string instead of the $elements array;
  // masked at capture by `mask_all_text`, dropped here as defense-in-depth.
  delete out.$elements_chain;

  if (Array.isArray(out.$elements)) {
    out.$elements = out.$elements.map((element) => {
      if (element && typeof element === 'object') {
        const copy = { ...(element as Record<string, unknown>) };
        delete copy.$el_text;
        delete copy.text;
        return copy;
      }
      return element;
    });
  }

  return out;
}
