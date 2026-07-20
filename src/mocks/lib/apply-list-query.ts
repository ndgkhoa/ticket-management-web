import {
  computePageCount,
  FILTER_IS_NULL,
  pageToRange,
  shouldUseFullTextSearch,
  type ListParams,
  type ListResponse,
  type ListSort,
} from '~/lib/list-query';

export type ApplyListConfig<Row> = {
  filterable: Record<string, (row: Row) => string | null>;
  searchText?: (row: Row) => string;
  fallbackText?: (row: Row) => string;
  sortAccessors: Record<string, (row: Row) => string | number | null>;
  defaultSort: ListSort;
  tiebreakers: readonly ListSort[];
};

const NON_WORD = /[^\p{L}\p{N}]+/u;
const HYPHENATED = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu;

function splitWords(text: string): string[] {
  return text.toLowerCase().split(NON_WORD).filter(Boolean);
}

function tokenize(text: string): Set<string> {
  const lower = text.toLowerCase();
  const tokens = new Set(splitWords(lower));
  for (const compound of lower.matchAll(HYPHENATED)) tokens.add(compound[0]);
  return tokens;
}

function matchesFullText(text: string, query: string): boolean {
  const tokens = tokenize(text);
  const lowerTokens = splitWords(text);

  const phrases = [...query.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const withoutPhrases = query.replace(/"[^"]*"/g, ' ');
  const bareTerms = withoutPhrases.split(/\s+/).filter(Boolean);

  for (const term of bareTerms) {
    const negated = term.startsWith('-');
    const lexeme = term.replace(/^-/, '').toLowerCase();
    if (!lexeme) continue;
    const present = tokens.has(lexeme);
    if (negated ? present : !present) return false;
  }

  for (const phrase of phrases) {
    if (!containsSequence(lowerTokens, splitWords(phrase))) return false;
  }

  return true;
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return true;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    if (needle.every((tok, j) => haystack[i + j] === tok)) return true;
  }
  return false;
}

function compareRows<Row>(
  a: Row,
  b: Row,
  orderings: ListSort[],
  accessors: ApplyListConfig<Row>['sortAccessors']
): number {
  for (const { field, dir } of orderings) {
    const get = accessors[field];
    if (!get) continue;
    const av = get(a);
    const bv = get(b);
    if (av === bv) continue;
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp = av < bv ? -1 : 1;
    return dir === 'asc' ? cmp : -cmp;
  }
  return 0;
}

export function applyListQuery<Row>(
  rows: readonly Row[],
  params: ListParams,
  config: ApplyListConfig<Row>
): ListResponse<Row> {
  let result = rows.filter((row) =>
    Object.entries(params.filters).every(([column, value]) => {
      const get = config.filterable[column];
      if (!get) return true;
      const cell = get(row);
      if (Array.isArray(value)) return value.includes(cell ?? '');
      if (value === FILTER_IS_NULL) return cell === null;
      return cell === value;
    })
  );

  const q = params.q;
  if (q) {
    const useFts = config.searchText !== undefined && shouldUseFullTextSearch(q);
    const trgm = (row: Row) =>
      (config.fallbackText?.(row) ?? '').toLowerCase().includes(q.toLowerCase());

    if (useFts) {
      const ftsMatches = result.filter((row) => matchesFullText(config.searchText!(row), q));
      result = ftsMatches.length > 0 ? ftsMatches : result.filter(trgm);
    } else if (config.fallbackText) {
      result = result.filter(trgm);
    }
  }

  const totalCount = result.length;

  const primary =
    params.sort && config.sortAccessors[params.sort.field] ? params.sort : config.defaultSort;
  const orderings = [primary, ...config.tiebreakers.filter((t) => t.field !== primary.field)];
  const sorted = [...result].sort((a, b) => compareRows(a, b, orderings, config.sortAccessors));

  const { from, to } = pageToRange(params.page, params.pageSize);
  const pageRows = sorted.slice(from, to + 1);

  return { rows: pageRows, totalCount, pageCount: computePageCount(totalCount, params.pageSize) };
}
