import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  TICKET_EVENT_COLUMNS,
  ticketEventSchema,
} from '~/features/tickets/schemas/ticket-event-schema';

/**
 * The ticket audit trail behind the activity timeline — read-only from the client. Reads are
 * newest-first (a feed). The trail is append-only and written entirely by database triggers on
 * the state changes themselves (create, field change, comment); the client holds no write to
 * it, so the subject of the trail can't rewrite its own history.
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
};
