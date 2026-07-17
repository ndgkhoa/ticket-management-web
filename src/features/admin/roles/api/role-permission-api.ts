import { z } from 'zod';

import { supabase } from '~/lib/supabase';

/**
 * The role → permission membership (`role_permissions` junction) behind the matrix
 * editor. This is the assignment RBAC is actually about: RLS reads it to resolve which
 * permission codes a role grants. The permission catalogue itself is fixed (defined by
 * the policies); only which roles hold which codes is editable here.
 */
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
