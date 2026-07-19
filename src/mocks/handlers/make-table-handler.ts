import { http, type HttpHandler } from 'msw';

import { applyListQuery, type ApplyListConfig } from '~/mocks/lib/apply-list-query';
import { createTableStore, type TableStore } from '~/mocks/lib/table-store';
import { publishChange } from '~/mocks/lib/realtime-bus';
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
 * One PostgREST table endpoint over a mutable fixture store — the mechanism that makes
 * `VITE_API_MODE=msw` answer real data AND accept writes. supabase-js issues plain
 * PostgREST requests in every mode; this intercepts them at the network layer so feature
 * code runs unchanged against the mock and the live project.
 *
 * Reads resolve one of three ways: `.single()` → one row by id; a paginated list (has
 * `limit`/count) with a list config → the parity-tested `applyListQuery` + a
 * `Content-Range`; else a plain filtered + ordered read. Writes (POST/PATCH/DELETE)
 * mutate the store and echo the affected row when `return=representation` is requested.
 */

type TableConfig<Row extends Record<string, unknown> & { id: string }> = {
  table: string;
  rows: readonly Row[];
  /** Present only for tables with a paginated + searchable list (tickets today). */
  applyConfig?: ApplyListConfig<Row>;
  /** Row identity for detail lookups + writes. Defaults to the `id` column. */
  getId?: (row: Row) => string;
  /**
   * Register the POST/PATCH/DELETE verbs. Off by default so a read-only table (tickets,
   * profiles, roles, permissions) exposes no mutable surface over its store — only the
   * admin lookup tables opt in.
   */
  writable?: boolean;
  /**
   * An existing store to read from, instead of one seeded internally from `rows`. Supplied
   * when another handler must mutate the same data — tickets share a store with the bulk
   * RPC, so a bulk change shows up on the next list read.
   */
  store?: TableStore<Row>;
  /**
   * Broadcast INSERT/UPDATE/DELETE on this table over the realtime bus, so other tabs of the
   * demo react (the live twin is Supabase Realtime replicating the write). Off by default.
   */
  realtime?: boolean;
  /**
   * MSW parity for database triggers, which don't run under MSW. `stampInsert` transforms a
   * row before it is stored (e.g. resolve SLA due_at from priority); `stampUpdate` augments a
   * PATCH from the current row (e.g. stamp resolved_at when a ticket enters `solved`);
   * `afterInsert` runs a side effect on another store (e.g. an agent reply stamps its ticket's
   * first_response_at). Each mirrors a specific trigger — keep them tiny and colocated.
   */
  stampInsert?: (row: Row) => Row;
  stampUpdate?: (patch: Partial<Row>, current: Row) => Partial<Row>;
  afterInsert?: (row: Row) => void;
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

export function makeTableHandler<Row extends Record<string, unknown> & { id: string }>(
  config: TableConfig<Row>
): HttpHandler[] {
  const { table, applyConfig } = config;
  const getId = config.getId ?? ((row: Row) => String(row.id));
  const store = config.store ?? createTableStore(config.rows);
  const path = `*/rest/v1/${table}`;

  const read = http.get(path, ({ request }) => {
    const query = parsePostgrestRequest(request);
    const rows = store.all();

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

  // `.insert(row)` — supabase-js posts an object (or array); an absent id is server-filled.
  const create = http.post(path, async ({ request }) => {
    const query = parsePostgrestRequest(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rows = (Array.isArray(body) ? body : [body]).map((row) => {
      const withId = { ...row, id: row.id ?? crypto.randomUUID() } as Row;
      const stamped = config.stampInsert ? config.stampInsert(withId) : withId;
      const inserted = store.insert(stamped);
      config.afterInsert?.(inserted);
      if (config.realtime) publishChange(table, { eventType: 'INSERT', new: inserted, old: null });
      return inserted;
    });
    return query.single ? objectResponse(rows[0]) : collectionResponse(rows);
  });

  // `.update(patch).eq('id', …)` — apply the patch to the addressed row.
  const modify = http.patch(path, async ({ request }) => {
    const query = parsePostgrestRequest(request);
    const patch = (await request.json().catch(() => ({}))) as Partial<Row>;
    const id = query.filters.id?.value;
    const current = id ? store.all().find((row) => getId(row) === id) : undefined;
    const finalPatch = config.stampUpdate && current ? config.stampUpdate(patch, current) : patch;
    const updated = id ? store.update(id, finalPatch) : undefined;
    if (!updated) return notFoundResponse();
    if (config.realtime) publishChange(table, { eventType: 'UPDATE', new: updated, old: null });
    return query.single ? objectResponse(updated) : collectionResponse([updated]);
  });

  // `.delete().eq('id', …)` — remove the row; no body unless representation is asked for.
  const destroy = http.delete(path, ({ request }) => {
    const query = parsePostgrestRequest(request);
    const id = query.filters.id?.value;
    const removed = id ? store.remove(id) : undefined;
    if (config.realtime && removed)
      publishChange(table, { eventType: 'DELETE', new: null, old: removed });
    return query.single && removed
      ? objectResponse(removed)
      : collectionResponse(removed ? [removed] : []);
  });

  return config.writable ? [read, create, modify, destroy] : [read];
}
