import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { TEAM_COLUMNS, teamSchema, type Team } from '~/features/admin/teams/schemas/team-schema';

export type TeamInput = { name: string; description: string | null };

export const teamApi = {
  list: async (): Promise<Team[]> => {
    const { data } = await supabase.from('teams').select(TEAM_COLUMNS).order('name').throwOnError();
    return z.array(teamSchema).parse(data);
  },

  create: async (input: TeamInput): Promise<Team> => {
    const { data } = await supabase
      .from('teams')
      .insert(input)
      .select(TEAM_COLUMNS)
      .single()
      .throwOnError();
    return teamSchema.parse(data);
  },

  update: async (id: string, input: TeamInput): Promise<Team> => {
    const { data } = await supabase
      .from('teams')
      .update(input)
      .eq('id', id)
      .select(TEAM_COLUMNS)
      .single()
      .throwOnError();
    return teamSchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('teams').delete().eq('id', id).throwOnError();
  },
};
