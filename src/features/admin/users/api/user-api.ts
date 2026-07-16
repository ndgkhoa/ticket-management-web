import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { USER_COLUMNS, userSchema } from '~/features/admin/users/schemas/user-schema';

/**
 * Data access for users (profiles). This stage lists the profiles a signed-in admin
 * may see — a plain ordered read, since the read-only view has no pagination yet.
 *
 * The server-side paginated list (the shared `list-query` contract: search, sort,
 * page params, `keepPreviousData`) lands with the admin UI rebuild that renders it;
 * the query key already carries params so that upgrade doesn't reshape the cache.
 */
export const userApi = {
  list: async () => {
    const { data } = await supabase
      .from('profiles')
      .select(USER_COLUMNS)
      .order('created_at', { ascending: false })
      .throwOnError();
    return z.array(userSchema).parse(data);
  },
};
