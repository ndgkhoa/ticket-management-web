import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { assigneeSchema } from '~/features/tickets/schemas/assignee-schema';

export const profileLookupApi = {
  byIds: async (ids: string[]) => {
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', ids)
      .throwOnError();
    return z.array(assigneeSchema).parse(data ?? []);
  },
};
