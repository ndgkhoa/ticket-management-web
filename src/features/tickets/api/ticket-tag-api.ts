import { supabase } from '~/lib/supabase';

export const ticketTagApi = {
  list: async (ticketId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('ticket_tags')
      .select('tag_id')
      .eq('ticket_id', ticketId)
      .throwOnError();
    return (data ?? []).map((row) => row.tag_id);
  },

  add: async (ticketId: string, tagId: string): Promise<void> => {
    await supabase
      .from('ticket_tags')
      .insert({ ticket_id: ticketId, tag_id: tagId })
      .throwOnError();
  },

  remove: async (ticketId: string, tagId: string): Promise<void> => {
    await supabase
      .from('ticket_tags')
      .delete()
      .eq('ticket_id', ticketId)
      .eq('tag_id', tagId)
      .throwOnError();
  },
};
