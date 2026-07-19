import { z } from 'zod';

/**
 * The one list contract every paginated screen speaks — tickets and the admin
 * tables alike. Defined once here so the URL (Phase 04's `validateSearch`), the
 * Supabase builder and the MSW applier cannot disagree about what a "page 2, sorted
 * by priority, filtered to open" request means. A pagination bug that reproduces
 * against one source and not the other means this contract was bypassed.
 */

/**
 * Allowed page sizes. An allowlist, not a range: an arbitrary `?pageSize=100000`
 * from a crafted URL must not become an unbounded scan. Any value off this list is
 * rejected by the schema and falls back to the default.
 */
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export type PageSize = (typeof PAGE_SIZES)[number];

export type SortDirection = 'asc' | 'desc';

export const sortSchema = z.object({
  /**
   * Column to sort by. A bare string here, validated against a per-table allowlist
   * in the builder — never passed to `.order()` unchecked, since an attacker-chosen
   * column name is both an information leak and a way to force a seq scan.
   */
  field: z.string().min(1),
  dir: z.enum(['asc', 'desc']),
});

export type ListSort = z.infer<typeof sortSchema>;

/**
 * The request shape. `z.coerce` on the numerics because these arrive from the URL as
 * strings; the coercion is what lets one schema serve both the API layer and the
 * router's `validateSearch`.
 */
export const listParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    // `.catch` rather than a plain default: an off-allowlist value (or garbage) is
    // coerced back to the default instead of failing the whole parse, so one bad URL
    // param never blanks the screen.
    .refine((value): value is (typeof PAGE_SIZES)[number] => PAGE_SIZES.includes(value as never))
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  sort: sortSchema.optional(),
  /**
   * Keyword query. Trimmed, and blank collapses to `undefined` so the builder skips
   * the search clause entirely — searching for `''` is not the same as not
   * searching, and only the latter is correct.
   */
  q: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
  /**
   * Column → value(s) filters. String or string[] (a multi-select facet). The set of
   * valid keys is table-specific and enforced by the builder, not here.
   */
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
});

export type ListParams = z.infer<typeof listParamsSchema>;

/**
 * The response shape — every list endpoint, no exceptions.
 *
 * `pageCount` is computed server-side and returned, never inferred by the table: the
 * client cannot divide by the page size correctly without the total, and a total it
 * guesses desyncs from the one RLS actually produced.
 *
 * A factory rather than a fixed schema so each feature validates its own row type
 * while the envelope stays identical.
 */
export function listResponseSchema<T extends z.ZodTypeAny>(rowSchema: T) {
  return z.object({
    rows: z.array(rowSchema),
    totalCount: z.number().int().nonnegative(),
    pageCount: z.number().int().nonnegative(),
  });
}

export type ListResponse<T> = {
  rows: T[];
  totalCount: number;
  pageCount: number;
};

/**
 * `page`/`pageSize` → the inclusive `[from, to]` a Supabase `.range()` wants.
 * Shared with the MSW applier so the two slice identically; an off-by-one here is a
 * whole row dropped or duplicated between pages.
 */
export function pageToRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** total rows → page count, floored at 1 so an empty result still renders "page 1 of 1". */
export function computePageCount(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

/**
 * Full-text search needs ≥3 characters to be meaningful; below that, and whenever an
 * FTS pass returns nothing, the builder falls back to a trigram `ilike`. Centralised
 * here so the Supabase builder and the MSW applier apply the identical rule.
 */
export const MIN_FTS_LENGTH = 3;

export function shouldUseFullTextSearch(q: string): boolean {
  return q.length >= MIN_FTS_LENGTH;
}

/**
 * Sentinel for an "is null" column filter — the MSW twin of a Supabase `.is(col, null)`.
 * Distinct from any real filter value (columns filter on UUIDs and enums, never this token).
 * The MSW request parser maps `col=is.null` onto it, and the applier matches rows whose
 * column is null. (Live PostgREST handles `is.null` natively; this only keeps the mock in step.)
 */
export const FILTER_IS_NULL = '__is_null__';
