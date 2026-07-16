import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { runListQuery, type ListQueryConfig } from '~/lib/list-query-builder';
import type { ListParams } from '~/lib/list-query';
import { TICKET_COLUMNS, ticketSchema } from '~/features/tickets/schemas/ticket-schema';

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
]);

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
    const { rows, totalCount, pageCount } = await runListQuery(
      () =>
        applyFilters(
          supabase.from('tickets').select(TICKET_COLUMNS, { count: 'estimated' }),
          params.filters
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
};
