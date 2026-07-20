import { HttpResponse } from 'msw';

type JsonRow = Record<string, unknown>;

export function listResponse(rows: JsonRow[], offset: number, totalCount: number) {
  const contentRange =
    rows.length > 0 ? `${offset}-${offset + rows.length - 1}/${totalCount}` : `*/${totalCount}`;
  return HttpResponse.json(rows, { headers: { 'Content-Range': contentRange } });
}

export function collectionResponse(rows: JsonRow[]) {
  return HttpResponse.json(rows);
}

export function objectResponse(row: JsonRow) {
  return HttpResponse.json(row, {
    headers: { 'Content-Type': 'application/vnd.pgrst.object+json' },
  });
}

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
