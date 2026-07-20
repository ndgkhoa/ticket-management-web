import { z } from 'zod';

import { supabase } from '~/lib/supabase';

export const rolePermissionApi = {
  listForRole: async (roleId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)
      .throwOnError();
    return z
      .array(z.object({ permission_id: z.uuid() }))
      .parse(data)
      .map((row) => row.permission_id);
  },

  add: async (roleId: string, permissionId: string): Promise<void> => {
    await supabase
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId })
      .throwOnError();
  },

  remove: async (roleId: string, permissionId: string): Promise<void> => {
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)
      .throwOnError();
  },
};
