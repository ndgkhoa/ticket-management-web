const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_NUMERIC_ID = /^\d{4,}$/;

const URL_PROPERTY_KEYS = ['$current_url', '$pathname', '$referrer', '$initial_current_url'];

export function normalizePath(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => (UUID.test(segment) || LONG_NUMERIC_ID.test(segment) ? ':id' : segment))
    .join('/');
}

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return url.origin + normalizePath(url.pathname);
  } catch {
    const [path = ''] = raw.split(/[?#]/);
    return normalizePath(path);
  }
}

interface SentryEventLike {
  request?: { url?: string; query_string?: unknown };
  extra?: Record<string, unknown>;
}

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

export function scrubSentryBreadcrumb(crumb: SentryBreadcrumbLike): SentryBreadcrumbLike {
  if (crumb.category?.startsWith('ui.')) delete crumb.message;
  const url = crumb.data?.url;
  if (typeof url === 'string') crumb.data = { ...crumb.data, url: normalizeUrl(url) };
  return crumb;
}

export function sanitizePosthogProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...properties };

  for (const key of URL_PROPERTY_KEYS) {
    if (typeof out[key] === 'string') out[key] = normalizeUrl(out[key] as string);
  }

  delete out.$el_text;
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
