import { http, type HttpHandler } from 'msw';

import { createJunctionStore } from '~/mocks/lib/table-store';
import { parsePostgrestRequest, type PostgrestQuery } from '~/mocks/lib/postgrest-request';
import { collectionResponse, objectResponse } from '~/mocks/lib/postgrest-response';

/**
 * A composite-key junction table endpoint (`role_permissions`, `user_roles`) over a
 * mutable store — the membership tables the admin role/permission editors write to. These
 * rows have no `id`, so `makeTableHandler` (which addresses rows by id) doesn't fit: reads
 * filter by the foreign-key `eq` columns and a delete matches on them too.
 *
 * Only the operations the app issues are handled: a filtered read, an insert, and a
 * delete addressed by the key columns.
 */

/** The `col=eq.value` filters as a plain map — what a delete is addressed by. */
function eqFilters(query: PostgrestQuery): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query.filters)
      .filter(([, filter]) => filter.op === 'eq')
      .map(([column, filter]) => [column, filter.value])
  );
}

/** Parse a PostgREST `in.(a,b,c)` list value into its members. */
function parseInList(value: string): string[] {
  return value
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map((entry) => entry.trim().replace(/^"|"$/g, ''));
}

/**
 * Does a row satisfy every eq/in filter on the query? Reads honour `in` (a tag filter
 * reads `ticket_tags?tag_id=in.(…)`) as well as `eq`; an `eq`-only read is the common
 * membership lookup. Deletes stay eq-only (a junction row is addressed by its exact key).
 */
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
    const inserted = (Array.isArray(body) ? body : [body]).map((row) => store.insert(row));
    return query.single ? objectResponse(inserted[0]) : collectionResponse(inserted);
  });

  const destroy = http.delete(path, ({ request }) => {
    const query = parsePostgrestRequest(request);
    const match = eqFilters(query);
    const removed = matching(match);
    store.removeWhere(match);
    return collectionResponse(removed);
  });

  return [read, create, destroy];
}
