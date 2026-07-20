import { z } from 'zod';

import { supabase } from '~/lib/supabase';

export const teamMemberApi = {
  listIds: async (teamId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .throwOnError();
    return z
      .array(z.object({ user_id: z.uuid() }))
      .parse(data ?? [])
      .map((row) => row.user_id);
  },

  add: async (teamId: string, userId: string): Promise<void> => {
    await supabase.from('team_members').insert({ team_id: teamId, user_id: userId }).throwOnError();
  },

  remove: async (teamId: string, userId: string): Promise<void> => {
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .throwOnError();
  },
};
