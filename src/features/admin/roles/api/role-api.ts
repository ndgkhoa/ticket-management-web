import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { ROLE_COLUMNS, roleSchema, type Role } from '~/features/admin/roles/schemas/role-schema';

export type RoleInput = { name: string; description: string | null };

export const roleApi = {
  list: async (): Promise<Role[]> => {
    const { data } = await supabase.from('roles').select(ROLE_COLUMNS).order('name').throwOnError();
    return z.array(roleSchema).parse(data);
  },

  create: async (input: RoleInput): Promise<Role> => {
    const { data } = await supabase
      .from('roles')
      .insert({ ...input, is_system: false })
      .select(ROLE_COLUMNS)
      .single()
      .throwOnError();
    return roleSchema.parse(data);
  },

  update: async (id: string, input: RoleInput): Promise<Role> => {
    const { data } = await supabase
      .from('roles')
      .update(input)
      .eq('id', id)
      .select(ROLE_COLUMNS)
      .single()
      .throwOnError();
    return roleSchema.parse(data);
  },

  remove: async (id: string): Promise<void> => {
    await supabase.from('roles').delete().eq('id', id).throwOnError();
  },
};
