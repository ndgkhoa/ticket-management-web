import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import type { Json } from '~/lib/database.types';
import {
  TICKET_EVENT_COLUMNS,
  ticketEventSchema,
} from '~/features/tickets/schemas/ticket-event-schema';
import type { TicketEventType } from '~/features/tickets/schemas/ticket-enums';

export type CreateEventInput = {
  ticketId: string;
  eventType: TicketEventType;
  meta?: Record<string, unknown>;
};

/**
 * The ticket audit trail behind the activity timeline. Reads are newest-first (a feed).
 * Append-only: there is no update or delete — RLS grants neither, and the timeline is the
 * record of what happened. The actor is the caller.
 */
export const ticketEventApi = {
  list: async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_events')
      .select(TICKET_EVENT_COLUMNS)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .throwOnError();
    return z.array(ticketEventSchema).parse(data);
  },

  create: async (input: CreateEventInput) => {
    const { data } = await supabase
      .from('ticket_events')
      .insert({
        ticket_id: input.ticketId,
        actor_id: useAuthStore.getState().user?.id,
        event_type: input.eventType,
        meta: (input.meta ?? {}) as Json,
        created_at: new Date().toISOString(),
      })
      .select(TICKET_EVENT_COLUMNS)
      .single()
      .throwOnError();
    return ticketEventSchema.parse(data);
  },
};
