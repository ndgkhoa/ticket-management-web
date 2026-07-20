import { z } from 'zod';

import { supabase } from '~/lib/supabase';

export const userRoleApi = {
  listForUser: async (userId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .throwOnError();
    return z
      .array(z.object({ role_id: z.uuid() }))
      .parse(data)
      .map((row) => row.role_id);
  },

  add: async (userId: string, roleId: string): Promise<void> => {
    await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId }).throwOnError();
  },

  remove: async (userId: string, roleId: string): Promise<void> => {
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .throwOnError();
  },
};
