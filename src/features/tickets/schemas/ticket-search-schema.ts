import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type ListParams } from '~/lib/list-query';
import { ticketPrioritySchema, ticketStatusSchema } from '~/features/tickets/schemas/ticket-enums';

/**
 * The ticket list URL contract.
 *
 * Flat rather than the nested `{ filters, sort: { field, dir } }` the data layer
 * speaks: `page`, `pageSize`, `sort`, `dir` are top-level, and `toTicketListParams`
 * bridges the two so URL and API stay one source of truth without forcing the URL to
 * carry the API's shape. Arrays (`status`, `priority`) are JSON-encoded by the
 * router's default search serializer (`?status=%5B%22open%22%5D`), not repeated
 * params — the URL is shareable and refresh-stable, though not hand-typed.
 *
 * `z.coerce` because search params arrive as strings, and `.catch()` everywhere a bad
 * value is survivable: hand-editing a param to garbage falls back to the default
 * instead of crashing the route. This is the Zod 4 schema TanStack Router consumes
 * directly (Standard Schema) — no zod-adapter, which would drag in a second Zod major.
 */
const SORTABLE_FIELDS = ['created_at', 'updated_at', 'priority', 'status', 'due_at'] as const;

export const ticketSearchSchema = z.object({
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
  // Filter values are validated against the enums here, at the URL boundary. A filter
  // array with ANY invalid member falls back to `undefined` (the whole filter, not
  // just the bad element) rather than crashing the route — so an invalid enum can
  // never reach the data layer and raise a Postgres 22P02. All-or-nothing is fine
  // because these arrays are app-generated from valid values; a mixed array only
  // arises from tampering, where dropping the filter is a safe response.
  status: z.array(ticketStatusSchema).optional().catch(undefined),
  priority: z.array(ticketPrioritySchema).optional().catch(undefined),
  assigneeId: z.uuid().optional().catch(undefined),
  sort: z.enum(SORTABLE_FIELDS).catch('created_at').default('created_at'),
  dir: z.enum(['asc', 'desc']).catch('desc').default('desc'),
});

export type TicketSearch = z.infer<typeof ticketSearchSchema>;

/** Default values, used to strip them back out of the URL for a clean `/tickets`. */
export const TICKET_SEARCH_DEFAULTS = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: 'created_at',
  dir: 'desc',
} as const;

/** Which params, when changed, must send the user back to page 1. */
export const PAGE_RESETTING_KEYS = ['q', 'pageSize', 'status', 'priority', 'assigneeId'] as const;

/** Map the URL search into the nested params shape the shared list query expects. */
export function toTicketListParams(search: TicketSearch): ListParams {
  const filters: ListParams['filters'] = {};
  if (search.status?.length) filters.status = search.status;
  if (search.priority?.length) filters.priority = search.priority;
  if (search.assigneeId) filters.assignee_id = search.assigneeId;

  return {
    page: search.page,
    pageSize: search.pageSize,
    q: search.q,
    sort: { field: search.sort, dir: search.dir },
    filters,
  };
}
