import { HttpResponse } from 'msw';

/**
 * Build the PostgREST-shaped responses supabase-js expects, so the client parses a mock
 * answer exactly as it would a live one.
 *
 * The load-bearing detail is the `Content-Range` header: with `{ count: … }` set,
 * supabase-js reads the total from there, not from the body. A list handler that returns
 * the right rows but omits the header makes every pager say "0 results" over a full table.
 */

type JsonRow = Record<string, unknown>;

/** A paginated list page. `offset` is the page's start row; `totalCount` the full match. */
export function listResponse(rows: JsonRow[], offset: number, totalCount: number) {
  const contentRange =
    rows.length > 0 ? `${offset}-${offset + rows.length - 1}/${totalCount}` : `*/${totalCount}`;
  return HttpResponse.json(rows, { headers: { 'Content-Range': contentRange } });
}

/** A plain unpaginated read (`.select().order()` with no count) — just the array. */
export function collectionResponse(rows: JsonRow[]) {
  return HttpResponse.json(rows);
}

/**
 * A single row for a `.single()` request. The object content type mirrors what PostgREST
 * sends for an object request, and the body is the row itself (not a one-element array),
 * which is what supabase-js unwraps into `data`.
 */
export function objectResponse(row: JsonRow) {
  return HttpResponse.json(row, {
    headers: { 'Content-Type': 'application/vnd.pgrst.object+json' },
  });
}

/**
 * The 406 PostgREST returns when a `.single()` matches zero rows. supabase-js maps the
 * `PGRST116` code to an error, which is the path `.throwOnError()` / React Query expect
 * for a missing detail record.
 */
export function notFoundResponse() {
  return HttpResponse.json(
    {
      code: 'PGRST116',
      details: 'The result contains 0 rows',
      hint: null,
      message: 'JSON object requested, multiple (or no) rows returned',
    },
    { status: 406 }
  );
}
