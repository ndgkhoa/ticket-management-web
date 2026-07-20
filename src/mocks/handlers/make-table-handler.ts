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

type TableConfig<Row extends Record<string, unknown> & { id: string }> = {
  table: string;
  rows: readonly Row[];
  applyConfig?: ApplyListConfig<Row>;
  getId?: (row: Row) => string;
  writable?: boolean;
  store?: TableStore<Row>;
  realtime?: boolean;
  stampInsert?: (row: Row) => Row;
  stampUpdate?: (patch: Partial<Row>, current: Row) => Partial<Row>;
  afterInsert?: (row: Row) => void;
  afterUpdate?: (patch: Partial<Row>, current: Row) => void;
};

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

  const modify = http.patch(path, async ({ request }) => {
    const query = parsePostgrestRequest(request);
    const patch = (await request.json().catch(() => ({}))) as Partial<Row>;
    const id = query.filters.id?.value;
    const current = id ? store.all().find((row) => getId(row) === id) : undefined;
    const finalPatch = config.stampUpdate && current ? config.stampUpdate(patch, current) : patch;
    const updated = id ? store.update(id, finalPatch) : undefined;
    if (!updated) return notFoundResponse();
    if (current) config.afterUpdate?.(patch, current);
    if (config.realtime) publishChange(table, { eventType: 'UPDATE', new: updated, old: null });
    return query.single ? objectResponse(updated) : collectionResponse([updated]);
  });

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
