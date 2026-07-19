import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import {
  TICKET_MESSAGE_COLUMNS,
  ticketMessageSchema,
} from '~/features/tickets/schemas/ticket-message-schema';
import type { MessageType } from '~/features/tickets/schemas/ticket-enums';

export type CreateMessageInput = {
  ticketId: string;
  type: MessageType;
  body: string;
};

/**
 * The ticket conversation. Reads are ordered oldest-first (a timeline reads top to bottom);
 * RLS drops internal notes for customers, so this never has to filter by role itself. The
 * author is pinned to the caller — the insert policy re-checks it, so a reply can't be
 * forged in another name.
 */
export const ticketMessageApi = {
  list: async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_messages')
      .select(TICKET_MESSAGE_COLUMNS)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .throwOnError();
    return z.array(ticketMessageSchema).parse(data);
  },

  create: async (input: CreateMessageInput) => {
    const { data } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: input.ticketId,
        author_id: useAuthStore.getState().user?.id,
        type: input.type,
        body: input.body,
        created_at: new Date().toISOString(),
      })
      .select(TICKET_MESSAGE_COLUMNS)
      .single()
      .throwOnError();
    return ticketMessageSchema.parse(data);
  },
};
