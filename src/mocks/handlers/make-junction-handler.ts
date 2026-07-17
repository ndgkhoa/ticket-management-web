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

/** The `col=eq.value` filters as a plain map — the only shape a junction query uses. */
function eqFilters(query: PostgrestQuery): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query.filters)
      .filter(([, filter]) => filter.op === 'eq')
      .map(([column, filter]) => [column, filter.value])
  );
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
    return collectionResponse(matching(eqFilters(query)));
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
