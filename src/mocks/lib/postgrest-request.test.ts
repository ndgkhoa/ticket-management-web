import { describe, expect, it } from 'vitest';

import { parsePostgrestRequest, toListParams } from '~/mocks/lib/postgrest-request';

/**
 * The parser is the reverse of the Supabase list builder — it must read back exactly the
 * wire format supabase-js emits (verified against the real client's output). If these
 * drift, the MSW handler mis-reads a live-shaped request and the demo diverges from
 * production precisely where no higher-level test looks.
 */

const BASE = 'http://msw.local/rest/v1/tickets';

function parse(query: string, headers?: Record<string, string>) {
  return parsePostgrestRequest(new Request(`${BASE}?${query}`, { headers }));
}

describe('parsePostgrestRequest', () => {
  it('reads eq / in filters, multi-column order, and offset/limit', () => {
    const result = parse(
      'select=id&status=eq.open&priority=in.(high,urgent)' +
        '&order=created_at.desc.nullslast,id.desc.nullslast&offset=20&limit=20',
      { prefer: 'count=estimated' }
    );

    expect(result.filters.status).toEqual({ op: 'eq', value: 'open', config: undefined });
    expect(result.filters.priority).toEqual({
      op: 'in',
      value: '(high,urgent)',
      config: undefined,
    });
    expect(result.order).toEqual([
      { field: 'created_at', dir: 'desc', nullsFirst: false },
      { field: 'id', dir: 'desc', nullsFirst: false },
    ]);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(20);
    expect(result.wantCount).toBe(true);
    expect(result.single).toBe(false);
  });

  it('detects a .single() request from the object Accept header', () => {
    const result = parse('select=id&id=eq.abc-123', {
      accept: 'application/vnd.pgrst.object+json',
    });

    expect(result.single).toBe(true);
    expect(result.filters.id).toEqual({ op: 'eq', value: 'abc-123', config: undefined });
  });

  it('parses a websearch operator with its text-search config', () => {
    const result = parse('search_vector=wfts(simple).time-sensitive+refund&offset=0&limit=20');

    expect(result.filters.search_vector).toEqual({
      op: 'wfts',
      config: 'simple',
      value: 'time-sensitive refund',
    });
  });

  it('treats a plain read (no limit) distinctly from a list', () => {
    const result = parsePostgrestRequest(
      new Request('http://msw.local/rest/v1/roles?select=id,name&order=name.asc')
    );

    expect(result.limit).toBeNull();
    expect(result.offset).toBe(0);
    expect(result.order).toEqual([{ field: 'name', dir: 'asc', nullsFirst: false }]);
  });
});

describe('toListParams', () => {
  it('reverses offset/limit into page/pageSize', () => {
    const params = toListParams(parse('order=created_at.desc&offset=40&limit=20'));

    expect(params.page).toBe(3);
    expect(params.pageSize).toBe(20);
    expect(params.sort).toEqual({ field: 'created_at', dir: 'desc' });
  });

  it('maps eq to a scalar filter and in to an array facet', () => {
    const params = toListParams(parse('status=eq.open&priority=in.(high,urgent)&limit=20'));

    expect(params.filters).toEqual({ status: 'open', priority: ['high', 'urgent'] });
  });

  it('takes q from the websearch operator', () => {
    const params = toListParams(parse('search_vector=wfts(simple).refund+invoice&limit=20'));

    expect(params.q).toBe('refund invoice');
  });

  it('unescapes a trigram ilike pattern back to the raw query', () => {
    // The builder escapes `%`/`_`, wraps in `%…%`; the reverse must recover the literal.
    const params = toListParams(parse('subject=ilike.%2550%5C%25+off%25&limit=20'));

    expect(params.q).toBe('50% off');
  });
});
