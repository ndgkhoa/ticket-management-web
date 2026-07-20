import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import { uploadAttachment } from '~/lib/storage';
import {
  ATTACHMENT_COLUMNS,
  attachmentSchema,
  type Attachment,
} from '~/features/tickets/schemas/attachment-schema';

export const attachmentApi = {
  list: async (ticketId: string): Promise<Attachment[]> => {
    const { data } = await supabase
      .from('attachments')
      .select(ATTACHMENT_COLUMNS)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .throwOnError();
    return z.array(attachmentSchema).parse(data);
  },

  create: async (ticketId: string, file: File): Promise<Attachment> => {
    const { url } = await uploadAttachment(ticketId, file);
    const { data } = await supabase
      .from('attachments')
      .insert({
        ticket_id: ticketId,
        message_id: null,
        file_url: url,
        file_name: file.name,
        size_bytes: file.size,
        uploaded_by: useAuthStore.getState().user?.id ?? null,
        created_at: new Date().toISOString(),
      })
      .select(ATTACHMENT_COLUMNS)
      .single()
      .throwOnError();
    return attachmentSchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('attachments').delete().eq('id', id).throwOnError();
  },
};
