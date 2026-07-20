import { DEFAULT_PAGE_SIZE, FILTER_IS_NULL, type ListParams } from '~/lib/list-query';

export type ParsedFilter = { op: string; value: string; config?: string };

export type OrderTerm = { field: string; dir: 'asc' | 'desc'; nullsFirst: boolean };

export type PostgrestQuery = {
  filters: Record<string, ParsedFilter>;
  order: OrderTerm[];
  limit: number | null;
  offset: number;
  single: boolean;
  wantCount: boolean;
};

const RESERVED_KEYS = new Set(['select', 'order', 'offset', 'limit']);

const OPERATOR_PATTERN = /^([a-z]+)(?:\(([^)]*)\))?\.(.*)$/s;

const FTS_OPERATORS = new Set(['fts', 'plfts', 'phfts', 'wfts']);

function parseOrder(raw: string | null): OrderTerm[] {
  if (!raw) return [];
  return raw.split(',').map((term) => {
    const parts = term.split('.');
    return {
      field: parts[0],
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

function parseInList(value: string): string[] {
  return value
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((entry) => entry.trim().replace(/^"|"$/g, ''))
    .filter((entry) => entry.length > 0);
}

function unescapeLikePattern(pattern: string): string {
  let inner = pattern;
  if (inner.startsWith('%') || inner.startsWith('*')) inner = inner.slice(1);
  if (inner.endsWith('%') || inner.endsWith('*')) inner = inner.slice(0, -1);
  return inner.replace(/\\([%_\\])/g, '$1');
}

export function toListParams(query: PostgrestQuery): ListParams {
  const pageSize = (query.limit ?? DEFAULT_PAGE_SIZE) as ListParams['pageSize'];
  const page = query.limit ? Math.floor(query.offset / query.limit) + 1 : 1;

  const filters: Record<string, string | string[]> = {};
  let ftsQuery: string | undefined;
  let trigramQuery: string | undefined;

  for (const [column, filter] of Object.entries(query.filters)) {
    if (filter.op === 'eq') filters[column] = filter.value;
    else if (filter.op === 'in') filters[column] = parseInList(filter.value);
    else if (filter.op === 'is' && filter.value === 'null') filters[column] = FILTER_IS_NULL;
    else if (FTS_OPERATORS.has(filter.op)) ftsQuery = filter.value;
    else if (filter.op === 'ilike' || filter.op === 'like')
      trigramQuery = unescapeLikePattern(filter.value);
  }

  const primary = query.order[0];

  return {
    page,
    pageSize,
    sort: primary ? { field: primary.field, dir: primary.dir } : undefined,
    q: ftsQuery ?? trigramQuery,
    filters,
  };
}
