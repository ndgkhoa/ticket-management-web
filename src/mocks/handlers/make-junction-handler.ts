import { http, type HttpHandler } from 'msw';

import { createJunctionStore } from '~/mocks/lib/table-store';
import { parsePostgrestRequest, type PostgrestQuery } from '~/mocks/lib/postgrest-request';
import { collectionResponse, objectResponse } from '~/mocks/lib/postgrest-response';

function eqFilters(query: PostgrestQuery): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query.filters)
      .filter(([, filter]) => filter.op === 'eq')
      .map(([column, filter]) => [column, filter.value])
  );
}

function parseInList(value: string): string[] {
  return value
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((entry) => entry.trim().replace(/^"|"$/g, ''));
}

function matchesRead<Row extends Record<string, unknown>>(
  row: Row,
  query: PostgrestQuery
): boolean {
  return Object.entries(query.filters).every(([column, filter]) => {
    const cell = String(row[column]);
    if (filter.op === 'eq') return cell === filter.value;
    if (filter.op === 'in') return parseInList(filter.value).includes(cell);
    return true;
  });
}

export function makeJunctionHandler<Row extends Record<string, unknown>>(config: {
  table: string;
  rows: readonly Row[];
  afterInsert?: (row: Row) => void;
  afterDelete?: (row: Row) => void;
}): HttpHandler[] {
  const store = createJunctionStore(config.rows);
  const path = `*/rest/v1/${config.table}`;

  const matching = (match: Record<string, string>) =>
    store
      .all()
      .filter((row) => Object.entries(match).every(([col, value]) => String(row[col]) === value));

  const read = http.get(path, ({ request }) => {
    const query = parsePostgrestRequest(request);
    return collectionResponse(store.all().filter((row) => matchesRead(row, query)));
  });

  const create = http.post(path, async ({ request }) => {
    const query = parsePostgrestRequest(request);
    const body = (await request.json().catch(() => ({}))) as Row | Row[];
    const inserted = (Array.isArray(body) ? body : [body]).map((row) => {
      const before = store.all().length;
      const saved = store.insert(row);
      if (store.all().length > before) config.afterInsert?.(saved);
      return saved;
    });
    return query.single ? objectResponse(inserted[0]) : collectionResponse(inserted);
  });

  const destroy = http.delete(path, ({ request }) => {
    const query = parsePostgrestRequest(request);
    const match = eqFilters(query);
    const removed = matching(match);
    store.removeWhere(match);
    for (const row of removed) config.afterDelete?.(row);
    return collectionResponse(removed);
  });

  return [read, create, destroy];
}
