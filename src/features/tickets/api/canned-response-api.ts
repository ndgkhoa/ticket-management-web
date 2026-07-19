import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import {
  CANNED_RESPONSE_COLUMNS,
  cannedResponseSchema,
} from '~/features/admin/canned-responses/schemas/canned-response-schema';

/**
 * Read side of the canned-response library as the ticket workflow consumes it (composer picker
 * + AI-draft context): the whole set, title-ordered. Distinct from the admin feature's paginated
 * table — this is a small bounded read. Reuses the admin row schema (DRY).
 */
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
