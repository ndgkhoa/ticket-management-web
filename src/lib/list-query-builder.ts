import {
  computePageCount,
  pageToRange,
  shouldUseFullTextSearch,
  type ListParams,
  type ListResponse,
  type ListSort,
} from '~/lib/list-query';

interface SupabaseListQuery<Row> extends PromiseLike<{
  data: Row[] | null;
  count: number | null;
  error: { message: string; code?: string } | null;
}> {
  textSearch(
    column: string,
    query: string,
    options: { type: 'websearch'; config?: string }
  ): SupabaseListQuery<Row>;
  ilike(column: string, pattern: string): SupabaseListQuery<Row>;
  order(
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean }
  ): SupabaseListQuery<Row>;
  range(from: number, to: number): SupabaseListQuery<Row>;
}

export type ListQueryConfig = {
  searchColumn?: string;
  searchConfig?: string;
  fallbackColumn?: string;
  sortableFields: readonly string[];
  defaultSort: ListSort;
  tiebreakers: readonly ListSort[];
};

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

  const orderings = [primary, ...config.tiebreakers.filter((t) => t.field !== primary.field)];

  return orderings.reduce(
    (acc, ordering) =>
      acc.order(ordering.field, { ascending: ordering.dir === 'asc', nullsFirst: false }),
    query
  );
}

async function runOnce<Row>(
  buildBase: () => SupabaseListQuery<Row>,
  params: ListParams,
  config: ListQueryConfig,
  mode: 'fts' | 'trgm' | 'none'
): Promise<{ rows: Row[]; totalCount: number }> {
  const buildSearchedSorted = () => {
    let query = buildBase();

    if (mode === 'fts' && params.q && config.searchColumn) {
      query = query.textSearch(config.searchColumn, params.q, {
        type: 'websearch',
        config: config.searchConfig,
      });
    } else if (mode === 'trgm' && params.q && config.fallbackColumn) {
      query = query.ilike(config.fallbackColumn, `%${escapeLike(params.q)}%`);
    }

    return applySort(query, params, config);
  };

  const { from, to } = pageToRange(params.page, params.pageSize);
  const { data, count, error } = await buildSearchedSorted().range(from, to);

  if (error) {
    if (error.code === 'PGRST103') {
      const { count: total } = await buildSearchedSorted().range(0, 0);
      return { rows: [], totalCount: total ?? 0 };
    }
    throw new Error(error.message);
  }

  if (count === null) {
    throw new Error(
      "List query returned no count — the base query must select with { count: 'estimated' }."
    );
  }

  return { rows: data ?? [], totalCount: count };
}

export async function runListQuery<Row>(
  buildBase: () => SupabaseListQuery<Row>,
  params: ListParams,
  config: ListQueryConfig
): Promise<ListResponse<Row>> {
  const q = params.q;
  const useFts = q !== undefined && config.searchColumn !== undefined && shouldUseFullTextSearch(q);

  let result = await runOnce(buildBase, params, config, useFts ? 'fts' : q ? 'trgm' : 'none');

  if (useFts && result.totalCount === 0 && config.fallbackColumn) {
    result = await runOnce(buildBase, params, config, 'trgm');
  }

  return {
    rows: result.rows,
    totalCount: result.totalCount,
    pageCount: computePageCount(result.totalCount, params.pageSize),
  };
}
