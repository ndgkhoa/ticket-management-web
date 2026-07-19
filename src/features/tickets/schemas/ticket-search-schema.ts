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
  // Relationship filters — all multi-select facets, so all arrays of ids (uniform with
  // status/priority). A bad member drops the whole filter to undefined, same all-or-
  // nothing rule as the enums: a mixed array only comes from tampering, and dropping it
  // keeps an invalid uuid from reaching the data layer as a 22P02.
  assigneeIds: z.array(z.uuid()).optional().catch(undefined),
  teamIds: z.array(z.uuid()).optional().catch(undefined),
  categoryIds: z.array(z.uuid()).optional().catch(undefined),
  // Tags live on the `ticket_tags` junction, not a ticket column, so this resolves to a
  // set of ticket ids in the api layer rather than mapping to a `.in` on a column.
  tagIds: z.array(z.uuid()).optional().catch(undefined),
  sort: z.enum(SORTABLE_FIELDS).catch('created_at').default('created_at'),
  dir: z.enum(['asc', 'desc']).catch('desc').default('desc'),
  // "Smart search" toggle: when on (and there's a `q`), the list ranks by semantic
  // similarity instead of keyword match. Same URL, same `q` — only the backend path
  // differs, so a shared/bookmarked link restores the mode too.
  //
  // Accepts both the boolean the router serializes and its string form; a plain
  // `z.coerce.boolean()` would wrongly read the string `'false'` as `true`.
  smart: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .catch(false)
    .default(false),
  // Triage queue: show only unassigned AND unteamed tickets (the new-ticket queue an agent
  // works from). Same boolean/string handling as `smart`.
  triage: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .catch(false)
    .default(false),
});

export type TicketSearch = z.infer<typeof ticketSearchSchema>;

/** Default values, used to strip them back out of the URL for a clean `/tickets`. */
export const TICKET_SEARCH_DEFAULTS = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: 'created_at',
  dir: 'desc',
  // Boolean toggles default off — kept out of the URL so `/tickets` stays clean until a
  // toggle is actually on (`?smart=true` / `?triage=true`).
  smart: false,
  triage: false,
} as const;

/** Which params, when changed, must send the user back to page 1. */
export const PAGE_RESETTING_KEYS = [
  'q',
  'pageSize',
  'status',
  'priority',
  'assigneeIds',
  'teamIds',
  'categoryIds',
  'tagIds',
  // Switching keyword ↔ semantic changes the whole result set, so the old page offset is
  // meaningless (and would mislabel the row-index column).
  'smart',
  // Toggling the triage queue changes the whole result set too.
  'triage',
] as const;

/** Map the URL search into the nested params shape the shared list query expects. */
export function toTicketListParams(search: TicketSearch): ListParams {
  const filters: ListParams['filters'] = {};
  if (search.status?.length) filters.status = search.status;
  if (search.priority?.length) filters.priority = search.priority;
  if (search.assigneeIds?.length) filters.assignee_id = search.assigneeIds;
  if (search.teamIds?.length) filters.team_id = search.teamIds;
  if (search.categoryIds?.length) filters.category_id = search.categoryIds;
  // Not a ticket column — the api resolves it through the junction. Carried on `filters`
  // under a reserved key the column-filter allowlist deliberately omits.
  if (search.tagIds?.length) filters.tag_id = search.tagIds;
  // Reserved key: the api translates it to `assignee_id is null AND team_id is null`.
  if (search.triage) filters.triage = 'true';

  return {
    page: search.page,
    pageSize: search.pageSize,
    q: search.q,
    sort: { field: search.sort, dir: search.dir },
    filters,
  };
}
