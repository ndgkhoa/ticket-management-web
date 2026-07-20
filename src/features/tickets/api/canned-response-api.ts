import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  CANNED_RESPONSE_COLUMNS,
  cannedResponseSchema,
} from '~/features/admin/canned-responses/schemas/canned-response-schema';

export const cannedResponseApi = {
  list: async () => {
    const { data } = await supabase
      .from('canned_responses')
      .select(CANNED_RESPONSE_COLUMNS)
      .order('title', { ascending: true })
      .throwOnError();
    return z.array(cannedResponseSchema).parse(data);
  },
};
