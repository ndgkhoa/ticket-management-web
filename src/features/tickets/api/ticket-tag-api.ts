import { supabase } from '~/lib/supabase';

/**
 * A ticket's tags, through the `ticket_tags` junction. The list returns just the tag ids;
 * the UI resolves them to names/colours from the tags lookup it already has. Add/remove are
 * single-membership writes — the detail tag editor toggles one at a time.
 */
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
