import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type ListParams } from '~/lib/list-query';

/**
 * The users list URL contract — mirrors `ticket-search-schema.ts` but with no facet
 * filters: profiles carry no status/priority-like column to filter by, only the
 * keyword search and the three sortable columns.
 */
const SORTABLE_FIELDS = ['created_at', 'email', 'full_name'] as const;

export const userSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value): value is (typeof PAGE_SIZES)[number] => PAGE_SIZES.includes(value as never))
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  q: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
  sort: z.enum(SORTABLE_FIELDS).catch('created_at').default('created_at'),
  dir: z.enum(['asc', 'desc']).catch('desc').default('desc'),
});

export type UserSearch = z.infer<typeof userSearchSchema>;

/** Default values, used to strip them back out of the URL for a clean `/admin/users`. */
export const USER_SEARCH_DEFAULTS = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: 'created_at',
  dir: 'desc',
} as const;

/** Which params, when changed, must send the user back to page 1. */
export const PAGE_RESETTING_KEYS = ['q', 'pageSize'] as const;

/** Map the URL search into the nested params shape the shared list query expects. */
export function toUserListParams(search: UserSearch): ListParams {
  return {
    page: search.page,
    pageSize: search.pageSize,
    q: search.q,
    sort: { field: search.sort, dir: search.dir },
    filters: {},
  };
}
