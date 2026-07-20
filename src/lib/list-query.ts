import { z } from 'zod';

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
export type PageSize = (typeof PAGE_SIZES)[number];

export type SortDirection = 'asc' | 'desc';

export const sortSchema = z.object({
  field: z.string().min(1),
  dir: z.enum(['asc', 'desc']),
});

export type ListSort = z.infer<typeof sortSchema>;

export const listParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value): value is (typeof PAGE_SIZES)[number] => PAGE_SIZES.includes(value as never))
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  sort: sortSchema.optional(),
  q: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
  filters: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
});

export type ListParams = z.infer<typeof listParamsSchema>;

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

export function pageToRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function computePageCount(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export const MIN_FTS_LENGTH = 3;

export function shouldUseFullTextSearch(q: string): boolean {
  return q.length >= MIN_FTS_LENGTH;
}

export const FILTER_IS_NULL = '__is_null__';
