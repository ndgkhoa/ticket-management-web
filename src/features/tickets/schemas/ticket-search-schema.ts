import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type ListParams } from '~/lib/list-query';
import { ticketPrioritySchema, ticketStatusSchema } from '~/features/tickets/schemas/ticket-enums';

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
  status: z.array(ticketStatusSchema).optional().catch(undefined),
  priority: z.array(ticketPrioritySchema).optional().catch(undefined),
  assigneeIds: z.array(z.uuid()).optional().catch(undefined),
  teamIds: z.array(z.uuid()).optional().catch(undefined),
  categoryIds: z.array(z.uuid()).optional().catch(undefined),
  tagIds: z.array(z.uuid()).optional().catch(undefined),
  sort: z.enum(SORTABLE_FIELDS).catch('created_at').default('created_at'),
  dir: z.enum(['asc', 'desc']).catch('desc').default('desc'),
  smart: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .catch(false)
    .default(false),
  triage: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .catch(false)
    .default(false),
});

export type TicketSearch = z.infer<typeof ticketSearchSchema>;

export const TICKET_SEARCH_DEFAULTS = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: 'created_at',
  dir: 'desc',
  smart: false,
  triage: false,
} as const;

export const PAGE_RESETTING_KEYS = [
  'q',
  'pageSize',
  'status',
  'priority',
  'assigneeIds',
  'teamIds',
  'categoryIds',
  'tagIds',
  'smart',
  'triage',
] as const;

export function toTicketListParams(search: TicketSearch): ListParams {
  const filters: ListParams['filters'] = {};
  if (search.status?.length) filters.status = search.status;
  if (search.priority?.length) filters.priority = search.priority;
  if (search.assigneeIds?.length) filters.assignee_id = search.assigneeIds;
  if (search.teamIds?.length) filters.team_id = search.teamIds;
  if (search.categoryIds?.length) filters.category_id = search.categoryIds;
  if (search.tagIds?.length) filters.tag_id = search.tagIds;
  if (search.triage) filters.triage = 'true';

  return {
    page: search.page,
    pageSize: search.pageSize,
    q: search.q,
    sort: { field: search.sort, dir: search.dir },
    filters,
  };
}
