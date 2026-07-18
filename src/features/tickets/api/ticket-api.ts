import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import { runListQuery, type ListQueryConfig } from '~/lib/list-query-builder';
import type { ListParams } from '~/lib/list-query';
import type { TablesUpdate } from '~/lib/database.types';
import { TICKET_COLUMNS, ticketSchema } from '~/features/tickets/schemas/ticket-schema';
import type { TicketPriority, TicketStatus } from '~/features/tickets/schemas/ticket-enums';

/** What the create form submits. Requester is the caller; status/channel are defaulted. */
export type CreateTicketInput = {
  subject: string;
  description: string;
  priority: TicketPriority;
  categoryId: string | null;
};

/** A single-ticket field change from the detail workflow (each field independently). */
export type UpdateTicketPatch = {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  teamId?: string | null;
  categoryId?: string | null;
};

/**
 * A bulk status/assignee change. `status` and `assigneeId` are each independently
 * optional — a bar can change one, the other, or both. `assigneeId: null` is an explicit
 * unassign (distinct from "leave assignee alone", which is the field being absent).
 */
export type BulkTicketPatch = {
  status?: TicketStatus;
  assigneeId?: string | null;
};

/**
 * List-query configuration for tickets — the one place that declares what the ticket
 * list may sort by and how its keyword search behaves. `sortableFields` is an
 * allowlist: a sort on any other column falls back to the default rather than
 * ordering by an arbitrary caller-named column.
 */
const ticketListConfig: ListQueryConfig = {
  searchColumn: 'search_vector',
  // The tsvector is built with 'simple' (mixed en/vi content — see database-schema);
  // the query config must match or the stemmer silently mismatches the column.
  searchConfig: 'simple',
  fallbackColumn: 'subject',
  sortableFields: ['created_at', 'updated_at', 'priority', 'status', 'due_at'],
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};

/**
 * Filters that map to a direct ticket column. A value may be a single string (`.eq`)
 * or several (`.in`, a multi-select facet). Only these keys are honoured — an unknown
 * filter key is ignored rather than passed to PostgREST, so a crafted param can't
 * query a column that isn't meant to be filterable.
 *
 * The tag filter is deliberately absent: it runs through the `ticket_tags` junction,
 * not a ticket column, and lands with the ticket UI that needs it.
 */
const FILTERABLE_COLUMNS = new Set([
  'status',
  'priority',
  'channel',
  'assignee_id',
  'team_id',
  'category_id',
  // `id` is here for the tag filter's second step (`.in('id', ticketIds)`), never set
  // from the URL directly. Filtering by id is harmless — RLS still scopes the result.
  'id',
]);

/**
 * Tags aren't a ticket column — a ticket has many through `ticket_tags`. So the tag
 * filter resolves in two steps: read the ticket ids carrying ANY of the selected tags,
 * then constrain the main list to `id in (…)`. Keeping it a plain id constraint means
 * the count and pagination stay exact (a junction inner-join would multiply rows per
 * matching tag and break both). Runs identically against Supabase and the MSW mock,
 * since both are ordinary supabase-js calls. Returns `null` when no ticket matches, so
 * the caller can short-circuit to an empty page instead of an unconstrained query.
 */
async function resolveTagFilter(tagIds: string[]): Promise<string[] | null> {
  const { data } = await supabase
    .from('ticket_tags')
    .select('ticket_id')
    .in('tag_id', tagIds)
    .throwOnError();
  const ticketIds = [...new Set((data ?? []).map((row) => row.ticket_id))];
  return ticketIds.length > 0 ? ticketIds : null;
}

/**
 * Structural type over the two PostgREST methods used here, rather than the SDK's
 * internal builder generics — same reasoning as the list-query builder: only these
 * methods are needed, and pinning to the SDK signature would break on every bump.
 */
type FilterableQuery<Q> = {
  eq(column: string, value: string): Q;
  in(column: string, values: string[]): Q;
};

function applyFilters<Q extends FilterableQuery<Q>>(query: Q, filters: ListParams['filters']): Q {
  return Object.entries(filters).reduce((acc, [column, value]) => {
    if (!FILTERABLE_COLUMNS.has(column)) return acc;
    return Array.isArray(value) ? acc.in(column, value) : acc.eq(column, value);
  }, query);
}

export const ticketApi = {
  list: async (params: ListParams) => {
    const filters = { ...params.filters };

    // Resolve the tag filter (junction → ticket ids) before building the base query.
    // `tag_id` is dropped from the column filters either way — it is not a ticket column.
    if ('tag_id' in filters) {
      const tagIds = filters.tag_id;
      delete filters.tag_id;
      const ticketIds = await resolveTagFilter(Array.isArray(tagIds) ? tagIds : [tagIds]);
      if (ticketIds === null) {
        return { rows: [], totalCount: 0, pageCount: 1 };
      }
      filters.id = ticketIds;
    }

    const { rows, totalCount, pageCount } = await runListQuery(
      () =>
        applyFilters(
          supabase.from('tickets').select(TICKET_COLUMNS, { count: 'estimated' }),
          filters
        ),
      params,
      ticketListConfig
    );

    return { rows: z.array(ticketSchema).parse(rows), totalCount, pageCount };
  },

  detail: async (id: string) => {
    const { data } = await supabase
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('id', id)
      .single()
      .throwOnError();
    return ticketSchema.parse(data);
  },

  create: async (input: CreateTicketInput) => {
    const requesterId = useAuthStore.getState().user?.id;
    if (!requesterId) throw new Error('Not authenticated');
    const now = new Date().toISOString();
    // Every column the domain schema reads is sent explicitly: the mock insert fills only
    // `id`, so the server-defaulted and nullable columns must be present for the returned
    // row to round-trip against MSW as it does against the live defaults.
    const { data } = await supabase
      .from('tickets')
      .insert({
        subject: input.subject,
        description: input.description,
        status: 'open',
        priority: input.priority,
        channel: 'web',
        requester_id: requesterId,
        assignee_id: null,
        team_id: null,
        category_id: input.categoryId,
        sla_policy_id: null,
        first_response_at: null,
        resolved_at: null,
        due_at: null,
        created_at: now,
        updated_at: now,
      })
      .select(TICKET_COLUMNS)
      .single()
      .throwOnError();
    return ticketSchema.parse(data);
  },

  update: async (id: string, patch: UpdateTicketPatch) => {
    // Map the camelCase patch to columns; only provided fields are sent. `null` is a real
    // value here (unassign / clear team or category), distinct from an absent field.
    const columns: TablesUpdate<'tickets'> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) columns.status = patch.status;
    if (patch.priority !== undefined) columns.priority = patch.priority;
    if (patch.assigneeId !== undefined) columns.assignee_id = patch.assigneeId;
    if (patch.teamId !== undefined) columns.team_id = patch.teamId;
    if (patch.categoryId !== undefined) columns.category_id = patch.categoryId;

    const { data } = await supabase
      .from('tickets')
      .update(columns)
      .eq('id', id)
      .select(TICKET_COLUMNS)
      .single()
      .throwOnError();
    return ticketSchema.parse(data);
  },

  /**
   * Apply a status/assignee change to every ticket matching `filters`, server-side.
   * Both selection modes route here: a page-scoped selection passes `{ id: [...] }`; the
   * "select all matching" escape hatch passes the list's active filters. The RPC re-runs
   * the caller's RLS, so a filter is never trusted to scope access on its own — a 5,000-
   * ticket change is one small request, not a 5,000-id payload. Returns the affected count.
   */
  bulkUpdate: async (filters: ListParams['filters'], patch: BulkTicketPatch): Promise<number> => {
    // Every filter value goes to the RPC as a json array (the SQL expands it with
    // jsonb_array_elements_text); normalise a lone scalar so a single-value filter can't
    // arrive as a bare string the function can't unpack.
    const pFilters: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(filters)) {
      pFilters[key] = Array.isArray(value) ? value : [value];
    }

    const pPatch: Record<string, string> = {};
    if (patch.status !== undefined) pPatch.status = patch.status;
    // Empty string is the unassign sentinel the SQL reads back as null.
    if (patch.assigneeId !== undefined) pPatch.assignee_id = patch.assigneeId ?? '';

    const { data } = await supabase
      .rpc('bulk_update_tickets', { p_filters: pFilters, p_patch: pPatch })
      .throwOnError();
    return data ?? 0;
  },
};
