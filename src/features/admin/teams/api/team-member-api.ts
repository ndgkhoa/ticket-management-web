import { z } from 'zod';

import { supabase } from '~/lib/supabase';

/**
 * Team membership — the `team_members` junction (agent ↔ team). This table is load-bearing
 * for RLS (`can_access_ticket` → `is_team_member`, and the profiles roster), but had no
 * management surface: it was seed-only, so a real deploy could never add an agent to a team.
 * Writes are gated by `team.manage` in RLS; the addable roster is the assignable agents.
 */
export const teamMemberApi = {
  /** User ids of the agents currently in a team. */
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
