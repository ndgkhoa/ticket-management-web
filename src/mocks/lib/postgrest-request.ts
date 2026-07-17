import { DEFAULT_PAGE_SIZE, type ListParams } from '~/lib/list-query';

/**
 * Parse the PostgREST request supabase-js emits back into the shared list contract.
 *
 * This is the reverse of `list-query-builder.ts`: the builder turns `ListParams` into a
 * PostgREST query string + headers, and this turns that same wire format back into the
 * pieces the MSW appliers need. Keeping the two in one vocabulary is what lets a single
 * `applyListQuery` answer every list request without the handler re-deriving pagination.
 *
 * Only the operators supabase-js actually produces here are handled (eq, in, the
 * websearch/trigram search ops, ordering, offset/limit). An unknown operator is
 * ignored rather than guessed at — the same posture the real builder takes with an
 * off-allowlist filter key.
 */

export type ParsedFilter = { op: string; value: string; config?: string };

export type OrderTerm = { field: string; dir: 'asc' | 'desc'; nullsFirst: boolean };

export type PostgrestQuery = {
  /** Column → its parsed operator (`status` → `{ op: 'eq', value: 'open' }`). */
  filters: Record<string, ParsedFilter>;
  order: OrderTerm[];
  /** `null` when the request carries no `limit` — a plain read, not a paginated list. */
  limit: number | null;
  offset: number;
  /** `.single()` sets an object Accept header; the handler returns one row, not an array. */
  single: boolean;
  /** `{ count: … }` sets `Prefer: count=…`; the response must carry a `Content-Range`. */
  wantCount: boolean;
};

// Query keys that are structure, not column filters.
const RESERVED_KEYS = new Set(['select', 'order', 'offset', 'limit']);

// `op.value`, or `op(config).value` for the text-search operators that carry a config
// (`wfts(simple).…`). The `(config)` group only matches when a paren follows the op
// token directly, so `in.(a,b)` — where the paren follows the dot — parses as op `in`
// with value `(a,b)`, not as a config.
const OPERATOR_PATTERN = /^([a-z]+)(?:\(([^)]*)\))?\.(.*)$/s;

// The PostgREST full-text-search operator family (plain/phrase/websearch/to_tsquery).
const FTS_OPERATORS = new Set(['fts', 'plfts', 'phfts', 'wfts']);

function parseOrder(raw: string | null): OrderTerm[] {
  if (!raw) return [];
  return raw.split(',').map((term) => {
    const parts = term.split('.');
    return {
      field: parts[0],
      // PostgREST defaults to ascending when no direction token is present.
      dir: parts.includes('desc') ? 'desc' : 'asc',
      nullsFirst: parts.includes('nullsfirst'),
    };
  });
}

export function parsePostgrestRequest(request: Request): PostgrestQuery {
  const params = new URL(request.url).searchParams;

  const filters: Record<string, ParsedFilter> = {};
  for (const [key, raw] of params.entries()) {
    if (RESERVED_KEYS.has(key)) continue;
    const match = OPERATOR_PATTERN.exec(raw);
    if (!match) continue;
    const [, op, config, value] = match;
    filters[key] = { op, value, config: config || undefined };
  }

  const limitRaw = params.get('limit');
  const offsetRaw = params.get('offset');
  const accept = request.headers.get('accept') ?? '';
  const prefer = request.headers.get('prefer') ?? '';

  return {
    filters,
    order: parseOrder(params.get('order')),
    limit: limitRaw === null ? null : Number(limitRaw),
    offset: offsetRaw === null ? 0 : Number(offsetRaw),
    single: accept.includes('application/vnd.pgrst.object+json'),
    wantCount: prefer.includes('count='),
  };
}

/** `in.(high,urgent)` → `['high','urgent']`; quotes (used by PostgREST for values with
 *  special chars) are stripped so the compare sees the bare value. */
function parseInList(value: string): string[] {
  return value
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((entry) => entry.trim().replace(/^"|"$/g, ''))
    .filter((entry) => entry.length > 0);
}

/**
 * Reverse the builder's `ilike` pattern back to the user's raw query: drop the leading
 * and trailing wildcard, then undo the `\%`, `\_`, `\\` escaping `escapeLike` applied.
 * The result must equal the original `q`, since the MSW applier's trigram fallback
 * substring-matches against it directly.
 */
function unescapeLikePattern(pattern: string): string {
  let inner = pattern;
  if (inner.startsWith('%') || inner.startsWith('*')) inner = inner.slice(1);
  if (inner.endsWith('%') || inner.endsWith('*')) inner = inner.slice(0, -1);
  return inner.replace(/\\([%_\\])/g, '$1');
}

/**
 * Collapse a parsed request into `ListParams` for `applyListQuery`.
 *
 * `q` comes from whichever search operator the request carried — the websearch op on
 * the FTS pass, or the trigram `ilike` on the fallback pass. `applyListQuery` then
 * reproduces the full FTS→trigram decision internally, so routing either pass through
 * this one call yields the response the feature API would assemble from the live source.
 */
export function toListParams(query: PostgrestQuery): ListParams {
  // supabase-js only ever sends an allowlisted page size (the builder derives `limit`
  // from `pageSize`), so the URL value maps straight back onto the union.
  const pageSize = (query.limit ?? DEFAULT_PAGE_SIZE) as ListParams['pageSize'];
  const page = query.limit ? Math.floor(query.offset / query.limit) + 1 : 1;

  const filters: Record<string, string | string[]> = {};
  let ftsQuery: string | undefined;
  let trigramQuery: string | undefined;

  for (const [column, filter] of Object.entries(query.filters)) {
    if (filter.op === 'eq') filters[column] = filter.value;
    else if (filter.op === 'in') filters[column] = parseInList(filter.value);
    else if (FTS_OPERATORS.has(filter.op)) ftsQuery = filter.value;
    else if (filter.op === 'ilike' || filter.op === 'like')
      trigramQuery = unescapeLikePattern(filter.value);
  }

  const primary = query.order[0];

  return {
    page,
    pageSize,
    sort: primary ? { field: primary.field, dir: primary.dir } : undefined,
    // FTS wins if both are somehow present; in practice a request carries exactly one.
    q: ftsQuery ?? trigramQuery,
    filters,
  };
}
