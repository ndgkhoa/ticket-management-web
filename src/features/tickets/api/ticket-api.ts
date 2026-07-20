import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import { runListQuery, type ListQueryConfig } from '~/lib/list-query-builder';
import type { ListParams } from '~/lib/list-query';
import type { TablesUpdate } from '~/lib/database.types';
import { TICKET_COLUMNS, ticketSchema } from '~/features/tickets/schemas/ticket-schema';
import type { TicketPriority, TicketStatus } from '~/features/tickets/schemas/ticket-enums';

export type CreateTicketInput = {
  subject: string;
  description: string;
  priority: TicketPriority;
  categoryId: string | null;
};

export type UpdateTicketPatch = {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  teamId?: string | null;
  categoryId?: string | null;
};

export type BulkTicketPatch = {
  status?: TicketStatus;
  assigneeId?: string | null;
};

const ticketListConfig: ListQueryConfig = {
  searchColumn: 'search_vector',
  searchConfig: 'simple',
  fallbackColumn: 'subject',
  sortableFields: ['created_at', 'updated_at', 'priority', 'status', 'due_at'],
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};

const FILTERABLE_COLUMNS = new Set([
  'status',
  'priority',
  'channel',
  'assignee_id',
  'team_id',
  'category_id',
  'id',
]);

async function resolveTagFilter(tagIds: string[]): Promise<string[] | null> {
  const { data } = await supabase
    .from('ticket_tags')
    .select('ticket_id')
    .in('tag_id', tagIds)
    .throwOnError();
  const ticketIds = [...new Set((data ?? []).map((row) => row.ticket_id))];
  return ticketIds.length > 0 ? ticketIds : null;
}

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

    const triageOnly = filters.triage !== undefined;
    delete filters.triage;

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
      () => {
        const filtered = applyFilters(
          supabase.from('tickets').select(TICKET_COLUMNS, { count: 'estimated' }),
          filters
        );
        return triageOnly ? filtered.is('assignee_id', null).is('team_id', null) : filtered;
      },
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
        created_at: now,
        updated_at: now,
      })
      .select(TICKET_COLUMNS)
      .single()
      .throwOnError();
    return ticketSchema.parse(data);
  },

  update: async (id: string, patch: UpdateTicketPatch) => {
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

  bulkUpdate: async (filters: ListParams['filters'], patch: BulkTicketPatch): Promise<number> => {
    const pFilters: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(filters)) {
      pFilters[key] = Array.isArray(value) ? value : [value];
    }

    const pPatch: Record<string, string> = {};
    if (patch.status !== undefined) pPatch.status = patch.status;
    if (patch.assigneeId !== undefined) pPatch.assignee_id = patch.assigneeId ?? '';

    const { data } = await supabase
      .rpc('bulk_update_tickets', { p_filters: pFilters, p_patch: pPatch })
      .throwOnError();
    return data ?? 0;
  },
};
