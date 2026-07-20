import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { runListQuery, type ListQueryConfig } from '~/lib/list-query-builder';
import type { ListParams } from '~/lib/list-query';
import { USER_COLUMNS, userSchema } from '~/features/admin/users/schemas/user-schema';

const userListConfig: ListQueryConfig = {
  fallbackColumn: 'email',
  sortableFields: ['created_at', 'email', 'full_name'],
  defaultSort: { field: 'created_at', dir: 'desc' },
  tiebreakers: [
    { field: 'created_at', dir: 'desc' },
    { field: 'id', dir: 'desc' },
  ],
};

export const userApi = {
  list: async (params: ListParams) => {
    const { rows, totalCount, pageCount } = await runListQuery(
      () => supabase.from('profiles').select(USER_COLUMNS, { count: 'estimated' }),
      params,
      userListConfig
    );

    return { rows: z.array(userSchema).parse(rows), totalCount, pageCount };
  },
};
