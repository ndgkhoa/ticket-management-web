import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { ROLE_COLUMNS, roleSchema } from '~/features/admin/roles/schemas/role-schema';

/**
 * Data access for roles. Read-only this stage; role editing and the role-permission
 * matrix land with the admin UI rebuild. `.throwOnError()` rethrows the real
 * PostgrestError so React Query's error path carries the Postgres detail.
 */
export const roleApi = {
  list: async () => {
    const { data } = await supabase.from('roles').select(ROLE_COLUMNS).order('name').throwOnError();
    return z.array(roleSchema).parse(data);
  },
};
