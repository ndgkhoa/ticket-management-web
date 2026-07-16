import {
  computePageCount,
  pageToRange,
  shouldUseFullTextSearch,
  type ListParams,
  type ListResponse,
  type ListSort,
} from '~/lib/list-query';

/**
 * The Supabase half of the list contract: turn `ListParams` into search + sort +
 * range against a PostgREST query, and return the `{ rows, totalCount, pageCount }`
 * envelope. The MSW applier (mock source) mirrors this exact behaviour; a parity
 * test holds the two together.
 *
 * The builder is described structurally rather than by importing
 * `PostgrestFilterBuilder`: only four methods are needed, and pinning to the SDK's
 * internal generic signature would break on every `@supabase/supabase-js` bump for
 * no benefit. The real builder satisfies this shape by structural typing.
 */
interface SupabaseListQuery<Row> extends PromiseLike<{
  data: Row[] | null;
  count: number | null;
  error: { message: string } | null;
}> {
  textSearch(
    column: string,
    query: string,
    options: { type: 'websearch'; config?: string }
  ): SupabaseListQuery<Row>;
  ilike(column: string, pattern: string): SupabaseListQuery<Row>;
  order(column: string, options: { ascending: boolean }): SupabaseListQuery<Row>;
  range(from: number, to: number): SupabaseListQuery<Row>;
}

export type ListQueryConfig = {
  /**
   * tsvector column for full-text search (`search_vector` on tickets). Omit for a
   * table with no FTS — search then uses the trigram fallback directly.
   */
  searchColumn?: string;
  /**
   * The text-search config the tsvector column was built with. This MUST match, and
   * is not optional in practice: the column uses `'simple'`, and omitting this lets
   * supabase-js default the query to `'english'`, whose stemmer turns "invoice" into
   * "invoic" — which matches nothing in a `'simple'` vector, so FTS silently returns
   * zero and every stemmed word falls through to the trigram fallback. The mismatch is
   * invisible for un-stemmed words ("refund") and wrong for the rest.
   */
  searchConfig?: string;
  /**
   * Column for the trigram `ilike` fallback (`subject` on tickets). Used for short
   * queries and whenever FTS returns nothing. Required for any table that accepts
   * `q`; without it a `q` on a non-FTS table is silently ignored.
   */
  fallbackColumn?: string;
  /**
   * Columns a client may sort by. An allowlist: a `sort.field` outside it is dropped
   * to `defaultSort`, so a crafted param can neither order by a column that isn't
   * meant to be sortable nor smuggle SQL into `.order()`.
   */
  sortableFields: readonly string[];
  /** Applied when the request names no sort, or names one off the allowlist. */
  defaultSort: ListSort;
  /**
   * Appended after the primary sort to make the order total. Offset pagination over a
   * non-unique sort (status, priority) silently duplicates and skips rows between
   * pages without this; `id` is the natural final tiebreaker.
   */
  tiebreakers: readonly ListSort[];
};

/** Escape `%` and `_` so a user's literal query can't act as an `ilike` wildcard. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function applySort<Row>(
  query: SupabaseListQuery<Row>,
  params: ListParams,
  config: ListQueryConfig
): SupabaseListQuery<Row> {
  const primary =
    params.sort && config.sortableFields.includes(params.sort.field)
      ? params.sort
      : config.defaultSort;

  // Primary first, then each tiebreaker that isn't already the primary column.
  const orderings = [primary, ...config.tiebreakers.filter((t) => t.field !== primary.field)];

  return orderings.reduce(
    (acc, ordering) => acc.order(ordering.field, { ascending: ordering.dir === 'asc' }),
    query
  );
}

/**
 * Apply search (if any), then sort, then the page range, and await.
 *
 * `mode` decides how `q` is matched: `'fts'` uses the tsvector, `'trgm'` the ilike
 * fallback, `'none'` skips search. Kept as an explicit argument so the caller can
 * re-run the same params in trgm mode when an FTS pass comes back empty.
 */
async function runOnce<Row>(
  buildBase: () => SupabaseListQuery<Row>,
  params: ListParams,
  config: ListQueryConfig,
  mode: 'fts' | 'trgm' | 'none'
): Promise<{ rows: Row[]; totalCount: number }> {
  let query = buildBase();

  if (mode === 'fts' && params.q && config.searchColumn) {
    // `websearch` accepts human syntax ("exact phrase", -exclude) and never throws on
    // malformed input, unlike plainto/raw tsquery. `config` must match the column's
    // tsvector config — see `searchConfig`.
    query = query.textSearch(config.searchColumn, params.q, {
      type: 'websearch',
      config: config.searchConfig,
    });
  } else if (mode === 'trgm' && params.q && config.fallbackColumn) {
    query = query.ilike(config.fallbackColumn, `%${escapeLike(params.q)}%`);
  }

  query = applySort(query, params, config);

  const { from, to } = pageToRange(params.page, params.pageSize);
  const { data, count, error } = await query.range(from, to);

  if (error) throw new Error(error.message);

  // With `{ count: 'estimated' }` set, PostgREST always returns a numeric count;
  // `null` means the caller's `buildBase` forgot the option. Left as `count ?? 0`
  // that surfaces as `totalCount: 0` — the table renders rows while the pager says
  // "0 results", a silent wrong output on every screen that made the mistake. Fail
  // loudly at the contract boundary instead, so the bug is caught on first run.
  if (count === null) {
    throw new Error(
      "List query returned no count — the base query must select with { count: 'estimated' }."
    );
  }

  return { rows: data ?? [], totalCount: count };
}

/**
 * Run a list query end to end.
 *
 * @param buildBase a factory returning a fresh `.select(cols, { count: 'estimated' })`
 *   with the table's own filters already applied. A factory, not a builder, because a
 *   PostgREST builder is single-use and the trgm fallback needs a second, clean query.
 *
 * `count: 'estimated'` (the caller's job to set) rather than `'exact'`: an exact count
 * re-scans the whole filtered set on every debounced keystroke and comes to dominate
 * query time as the table grows. The estimate reflects only RLS-visible rows, so a
 * customer's total is their own, never the global one.
 */
export async function runListQuery<Row>(
  buildBase: () => SupabaseListQuery<Row>,
  params: ListParams,
  config: ListQueryConfig
): Promise<ListResponse<Row>> {
  const q = params.q;
  const useFts = q !== undefined && config.searchColumn !== undefined && shouldUseFullTextSearch(q);

  let result = await runOnce(buildBase, params, config, useFts ? 'fts' : q ? 'trgm' : 'none');

  // FTS matches lexemes, so it misses partial words and typos ("payme", "invioce").
  // An empty FTS result is exactly that case — fall back to the trigram ilike, which
  // is a different result set with its own pagination, hence a full re-run.
  if (useFts && result.totalCount === 0 && config.fallbackColumn) {
    result = await runOnce(buildBase, params, config, 'trgm');
  }

  return {
    rows: result.rows,
    totalCount: result.totalCount,
    pageCount: computePageCount(result.totalCount, params.pageSize),
  };
}
