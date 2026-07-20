import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  TICKET_EVENT_COLUMNS,
  ticketEventSchema,
} from '~/features/tickets/schemas/ticket-event-schema';

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
