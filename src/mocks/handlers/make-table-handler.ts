import { http, type HttpHandler } from 'msw';

import { applyListQuery, type ApplyListConfig } from '~/mocks/lib/apply-list-query';
import {
  parsePostgrestRequest,
  toListParams,
  type OrderTerm,
  type ParsedFilter,
  type PostgrestQuery,
} from '~/mocks/lib/postgrest-request';
import {
  collectionResponse,
  listResponse,
  notFoundResponse,
  objectResponse,
} from '~/mocks/lib/postgrest-response';

/**
 * One PostgREST table endpoint over in-memory fixtures — the mechanism that makes
 * `VITE_API_MODE=msw` answer real data. supabase-js issues plain PostgREST requests in
 * every mode; this intercepts them at the network layer so feature code runs unchanged
 * against the mock and the live project.
 *
 * A GET resolves one of three ways:
 *   - `.single()` → find one row by id (the detail read).
 *   - a paginated list (has `limit`/count) and a list config → route through
 *     `applyListQuery`, the parity-tested applier, and answer with a `Content-Range`.
 *   - anything else → a plain filtered + ordered read of every matching row.
 */

type TableConfig<Row extends Record<string, unknown>> = {
  table: string;
  rows: readonly Row[];
  /** Present only for tables with a paginated + searchable list (tickets today). */
  applyConfig?: ApplyListConfig<Row>;
  /** Row identity for detail lookups. Defaults to the `id` column every table has. */
  getId?: (row: Row) => string;
};

/** eq / in matching for the plain-read and detail paths — dynamic column access, since a
 *  fixture row's keys ARE its Postgres columns (snake_case). */
function matchesFilters<Row extends Record<string, unknown>>(
  row: Row,
  filters: Record<string, ParsedFilter>
): boolean {
  return Object.entries(filters).every(([column, filter]) => {
    const cell = row[column];
    const cellText = cell === null || cell === undefined ? '' : String(cell);
    if (filter.op === 'eq') return cellText === filter.value;
    if (filter.op === 'in')
      return filter.value
        .replace(/^\(|\)$/g, '')
        .split(',')
        .map((entry) => entry.trim().replace(/^"|"$/g, ''))
        .includes(cellText);
    // Any other operator on a plain read is not something the app emits — ignore it
    // rather than filter on a half-understood clause.
    return true;
  });
}

function compareByOrder<Row extends Record<string, unknown>>(
  a: Row,
  b: Row,
  order: OrderTerm[]
): number {
  for (const { field, dir, nullsFirst } of order) {
    const av = a[field];
    const bv = b[field];
    if (av === bv) continue;
    // Null placement matches the list builder's pinned `nullsFirst: false` default,
    // overridable per term by an explicit `nullsfirst` in the order clause.
    if (av === null || av === undefined) return nullsFirst ? -1 : 1;
    if (bv === null || bv === undefined) return nullsFirst ? 1 : -1;
    const cmp = av < bv ? -1 : 1;
    return dir === 'asc' ? cmp : -cmp;
  }
  return 0;
}

function plainRead<Row extends Record<string, unknown>>(
  rows: readonly Row[],
  query: PostgrestQuery
): Row[] {
  const filtered = rows.filter((row) => matchesFilters(row, query.filters));
  if (query.order.length === 0) return filtered;
  return [...filtered].sort((a, b) => compareByOrder(a, b, query.order));
}

export function makeTableHandler<Row extends Record<string, unknown>>(
  config: TableConfig<Row>
): HttpHandler {
  const { table, rows, applyConfig } = config;
  const getId = config.getId ?? ((row: Row) => String(row.id));

  return http.get(`*/rest/v1/${table}`, ({ request }) => {
    const query = parsePostgrestRequest(request);

    if (query.single) {
      const wanted = query.filters.id?.value;
      const found = wanted === undefined ? undefined : rows.find((row) => getId(row) === wanted);
      return found ? objectResponse(found) : notFoundResponse();
    }

    if (applyConfig && (query.limit !== null || query.wantCount)) {
      const { rows: pageRows, totalCount } = applyListQuery(rows, toListParams(query), applyConfig);
      return listResponse(pageRows, query.offset, totalCount);
    }

    return collectionResponse(plainRead(rows, query));
  });
}
