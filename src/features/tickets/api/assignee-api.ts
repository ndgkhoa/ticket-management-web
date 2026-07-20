import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { assigneeSchema } from '~/features/tickets/schemas/assignee-schema';

export const assigneeApi = {
  list: async () => {
    const { data } = await supabase.rpc('assignable_agents').throwOnError();
    return z.array(assigneeSchema).parse(data ?? []);
  },
};
