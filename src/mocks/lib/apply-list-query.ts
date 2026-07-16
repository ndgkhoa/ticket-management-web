import {
  computePageCount,
  pageToRange,
  shouldUseFullTextSearch,
  type ListParams,
  type ListResponse,
  type ListSort,
} from '~/lib/list-query';

/**
 * The MSW half of the list contract: filter → search → sort → slice over in-memory
 * fixtures, returning the identical `{ rows, totalCount, pageCount }` the Supabase
 * builder produces. A parity test asserts the two agree for the same params — if they
 * ever diverge, one of them is wrong, and that is the bug this file exists to make
 * impossible to ship silently.
 *
 * It mirrors `list-query-builder.ts` step for step, and reuses the same shared
 * helpers (`pageToRange`, `computePageCount`, `shouldUseFullTextSearch`) so the page
 * maths and the FTS-length threshold cannot drift between the two.
 */
export type ApplyListConfig<Row> = {
  /** Filterable columns → the row's value for that column (for eq/in matching). */
  filterable: Record<string, (row: Row) => string | null>;
  /** Text the full-text search runs over — subject + description, as the tsvector does. */
  searchText?: (row: Row) => string;
  /** Text the trigram fallback runs over — subject, as the trgm index does. */
  fallbackText?: (row: Row) => string;
  /** Sortable columns → the row's comparable value. An allowlist, as on the builder. */
  sortAccessors: Record<string, (row: Row) => string | number | null>;
  defaultSort: ListSort;
  tiebreakers: readonly ListSort[];
};

/**
 * Split on non-word runs, Unicode-aware. `\p{L}\p{N}` keeps accented and non-Latin
 * letters as word characters — the content is mixed en/vi (why the column uses the
 * `'simple'` config), and a plain `[^a-z0-9]` would shred every Vietnamese diacritic
 * into separate tokens, diverging from Postgres on exactly that content.
 */
const NON_WORD = /[^\p{L}\p{N}]+/u;
const HYPHENATED = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu;

function splitWords(text: string): string[] {
  return text.toLowerCase().split(NON_WORD).filter(Boolean);
}

/**
 * Tokenise like Postgres `to_tsvector('simple', …)` closely enough for the queries a
 * help desk actually receives. 'simple' does no stemming, so this needs none — it is
 * presence of a lexeme, not a stemmed match. Ranking (the A/B weights) is irrelevant
 * because the list orders by `created_at`, never by search rank.
 *
 * Hyphenated words get both the parts (from the split) AND the compound: Postgres
 * emits `time-sensitive` as its own lexeme alongside `time` and `sensitive`, so a
 * query for the single lexeme "time-sensitive" would otherwise match nothing here
 * even though the parts are present.
 */
function tokenize(text: string): Set<string> {
  const lower = text.toLowerCase();
  const tokens = new Set(splitWords(lower));
  for (const compound of lower.matchAll(HYPHENATED)) tokens.add(compound[0]);
  return tokens;
}

/**
 * Match `websearch_to_tsquery` semantics for the cases that occur in practice: bare
 * terms are AND-ed, `"a phrase"` must appear in order, and `-term` excludes. Anything
 * fancier degrades to term presence rather than throwing — `websearch` never errors
 * on malformed input, and neither may this.
 */
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

/** Does `haystack` contain `needle` as a contiguous run? (phrase search) */
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
    // Nulls last in both directions — the Supabase builder pins `nullsFirst: false`
    // to match this, rather than the two relying on Postgres's direction-dependent
    // default (NULLS FIRST for DESC), which would only agree by luck.
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
  // 1. Filter — eq for a scalar, in for an array, unknown keys ignored (as the builder).
  let result = rows.filter((row) =>
    Object.entries(params.filters).every(([column, value]) => {
      const get = config.filterable[column];
      if (!get) return true;
      const cell = get(row);
      return Array.isArray(value) ? value.includes(cell ?? '') : cell === value;
    })
  );

  // 2. Search — FTS for q ≥ 3 chars, trigram fallback below that or when FTS is empty.
  const q = params.q;
  if (q) {
    const useFts = config.searchText !== undefined && shouldUseFullTextSearch(q);
    const trgm = (row: Row) =>
      (config.fallbackText?.(row) ?? '').toLowerCase().includes(q.toLowerCase());

    if (useFts) {
      const ftsMatches = result.filter((row) => matchesFullText(config.searchText!(row), q));
      // Empty FTS → fall back to the trigram substring set, exactly as runListQuery re-runs.
      result = ftsMatches.length > 0 ? ftsMatches : result.filter(trgm);
    } else if (config.fallbackText) {
      result = result.filter(trgm);
    }
  }

  const totalCount = result.length;

  // 3. Sort — primary (or default if off-allowlist) then tiebreakers, de-duped.
  const primary =
    params.sort && config.sortAccessors[params.sort.field] ? params.sort : config.defaultSort;
  const orderings = [primary, ...config.tiebreakers.filter((t) => t.field !== primary.field)];
  const sorted = [...result].sort((a, b) => compareRows(a, b, orderings, config.sortAccessors));

  // 4. Slice to the page.
  const { from, to } = pageToRange(params.page, params.pageSize);
  const pageRows = sorted.slice(from, to + 1);

  return { rows: pageRows, totalCount, pageCount: computePageCount(totalCount, params.pageSize) };
}
