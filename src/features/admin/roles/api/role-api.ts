import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { ROLE_COLUMNS, roleSchema, type Role } from '~/features/admin/roles/schemas/role-schema';

/** The writable columns of a role. `is_system` is not among them — see `create`. */
export type RoleInput = { name: string; description: string | null };

/**
 * Data access for roles. A bounded table (a handful of rows), so the list is a plain
 * ordered read. `is_system` marks the seeded roles the RLS model depends on; the UI
 * refuses to delete them, and a role created here is never a system role.
 */
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
