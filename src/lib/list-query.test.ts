import { describe, expect, it } from 'vitest';

import {
  computePageCount,
  DEFAULT_PAGE_SIZE,
  listParamsSchema,
  pageToRange,
  shouldUseFullTextSearch,
} from '~/lib/list-query';
import { runListQuery, type ListQueryConfig } from '~/lib/list-query-builder';

describe('pagination math', () => {
  it('maps page/pageSize to an inclusive zero-based range', () => {
    expect(pageToRange(1, 20)).toEqual({ from: 0, to: 19 });
    expect(pageToRange(2, 20)).toEqual({ from: 20, to: 39 });
    expect(pageToRange(7, 50)).toEqual({ from: 300, to: 349 });
  });

  it('floors page count at 1 so an empty result is still "page 1 of 1"', () => {
    expect(computePageCount(0, 20)).toBe(1);
    expect(computePageCount(1, 20)).toBe(1);
    expect(computePageCount(21, 20)).toBe(2);
    expect(computePageCount(500, 20)).toBe(25);
  });
});

describe('listParamsSchema', () => {
  it('applies defaults for an empty request', () => {
    expect(listParamsSchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      filters: {},
    });
  });

  it('coerces string page/pageSize from the URL', () => {
    const parsed = listParamsSchema.parse({ page: '3', pageSize: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });

  it('rejects an off-allowlist pageSize back to the default, not an unbounded scan', () => {
    expect(listParamsSchema.parse({ pageSize: '100000' }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(listParamsSchema.parse({ pageSize: '17' }).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('coerces a garbage page back to 1 rather than blanking the screen', () => {
    expect(listParamsSchema.parse({ page: 'abc' }).page).toBe(1);
    expect(listParamsSchema.parse({ page: '-4' }).page).toBe(1);
  });

  it('trims q and collapses blank to undefined so the search clause is skipped', () => {
    expect(listParamsSchema.parse({ q: '  refund  ' }).q).toBe('refund');
    expect(listParamsSchema.parse({ q: '   ' }).q).toBeUndefined();
    expect(listParamsSchema.parse({ q: '' }).q).toBeUndefined();
  });
});

describe('shouldUseFullTextSearch', () => {
  it('needs at least three characters', () => {
    expect(shouldUseFullTextSearch('ab')).toBe(false);
    expect(shouldUseFullTextSearch('pay')).toBe(true);
  });
});

/**
 * A fake PostgREST builder that records what the runner did to it and returns a
 * scripted result. Structural typing lets it stand in for the real builder without a
 * live database, so the fallback logic, tiebreaker and range are all provable in CI.
 */
type Call =
  | { method: 'textSearch'; column: string; query: string }
  | { method: 'ilike'; column: string; pattern: string }
  | { method: 'order'; column: string; ascending: boolean }
  | { method: 'range'; from: number; to: number };

function fakeQuery(result: { data: unknown[]; count: number | null }) {
  const calls: Call[] = [];
  const builder = {
    calls,
    textSearch(column: string, query: string) {
      calls.push({ method: 'textSearch', column, query });
      return builder;
    },
    ilike(column: string, pattern: string) {
      calls.push({ method: 'ilike', column, pattern });
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      calls.push({ method: 'order', column, ascending: options.ascending });
      return builder;
    },
    range(from: number, to: number) {
      calls.push({ method: 'range', from, to });
      return builder;
    },
    then(resolve: (value: { data: unknown[]; count: number | null; error: null }) => unknown) {
      return Promise.resolve({ ...result, error: null }).then(resolve);
    },
  };
  return builder;
}

const config: ListQueryConfig = {
  searchColumn: 'search_vector',
  fallbackColumn: 'subject',
  sortableFields: ['created_at', 'priority', 'status'],
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};

describe('runListQuery', () => {
  it('skips search entirely when q is absent', async () => {
    const q = fakeQuery({ data: [{ id: '1' }], count: 1 });
    await runListQuery(() => q as never, listParamsSchema.parse({}), config);

    expect(q.calls.some((c) => c.method === 'textSearch' || c.method === 'ilike')).toBe(false);
  });

  it('uses full-text search for a q of three or more characters', async () => {
    const q = fakeQuery({ data: [{ id: '1' }], count: 1 });
    await runListQuery(() => q as never, listParamsSchema.parse({ q: 'refund' }), config);

    expect(q.calls).toContainEqual({
      method: 'textSearch',
      column: 'search_vector',
      query: 'refund',
    });
  });

  it('uses the trigram ilike fallback for a short q, with wildcards escaped', async () => {
    const q = fakeQuery({ data: [], count: 0 });
    await runListQuery(() => q as never, listParamsSchema.parse({ q: 'a%_' }), config);

    expect(q.calls).toContainEqual({ method: 'ilike', column: 'subject', pattern: '%a\\%\\_%' });
  });

  it('falls back to trigram when full-text search returns nothing', async () => {
    // First call (FTS) yields 0; second call (trgm) yields a hit. The factory is asked
    // for a fresh builder each time, exactly as a single-use PostgREST builder needs.
    const builders = [
      fakeQuery({ data: [], count: 0 }),
      fakeQuery({ data: [{ id: '1' }], count: 1 }),
    ];
    let i = 0;
    const result = await runListQuery(
      () => builders[i++] as never,
      listParamsSchema.parse({ q: 'payme' }),
      config
    );

    expect(builders[0].calls.some((c) => c.method === 'textSearch')).toBe(true);
    expect(builders[1].calls.some((c) => c.method === 'ilike')).toBe(true);
    expect(result.totalCount).toBe(1);
  });

  it('does not fall back when full-text search already found rows', async () => {
    const builders = [
      fakeQuery({ data: [{ id: '1' }], count: 1 }),
      fakeQuery({ data: [], count: 0 }),
    ];
    let i = 0;
    await runListQuery(
      () => builders[i++] as never,
      listParamsSchema.parse({ q: 'refund' }),
      config
    );

    expect(i).toBe(1); // second builder never requested
  });

  it('applies the primary sort then appends tiebreakers, skipping a duplicated column', async () => {
    const q = fakeQuery({ data: [], count: 0 });
    await runListQuery(
      () => q as never,
      listParamsSchema.parse({ sort: { field: 'priority', dir: 'asc' } }),
      config
    );

    const orders = q.calls.filter((c) => c.method === 'order');
    expect(orders).toEqual([
      { method: 'order', column: 'priority', ascending: true },
      { method: 'order', column: 'created_at', ascending: false },
      { method: 'order', column: 'id', ascending: false },
    ]);
  });

  it('drops a sort on a non-allowlisted column back to the default', async () => {
    const q = fakeQuery({ data: [], count: 0 });
    await runListQuery(
      () => q as never,
      listParamsSchema.parse({ sort: { field: 'embedding', dir: 'asc' } }),
      config
    );

    const orders = q.calls.filter((c) => c.method === 'order');
    // default (created_at desc) is primary; created_at tiebreaker is de-duped; id remains
    expect(orders).toEqual([
      { method: 'order', column: 'created_at', ascending: false },
      { method: 'order', column: 'id', ascending: false },
    ]);
  });

  it('throws a clear error when the base query forgot the count option', async () => {
    // count: null is exactly what PostgREST returns when { count: 'estimated' } was
    // omitted — the silent-totalCount-0 footgun. It must fail loudly, not report zero.
    const q = fakeQuery({ data: [{ id: '1' }], count: null });
    await expect(
      runListQuery(() => q as never, listParamsSchema.parse({}), config)
    ).rejects.toThrow(/count/i);
  });

  it('ranges by page and computes page count from the total', async () => {
    const q = fakeQuery({ data: [], count: 130 });
    const result = await runListQuery(
      () => q as never,
      listParamsSchema.parse({ page: '2', pageSize: '50' }),
      config
    );

    expect(q.calls).toContainEqual({ method: 'range', from: 50, to: 99 });
    expect(result.totalCount).toBe(130);
    expect(result.pageCount).toBe(3);
  });
});
