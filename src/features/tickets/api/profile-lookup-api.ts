import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { assigneeSchema } from '~/features/tickets/schemas/assignee-schema';

/**
 * Resolve a set of profile ids to name + avatar — for the detail page's requester, assignee,
 * message authors and event actors, which are all profiles. One `.in('id', …)` read; RLS
 * decides which of the requested profiles the caller may actually see (an id it can't see
 * simply doesn't come back, and the UI falls back to a placeholder). Reuses the assignee
 * projection since the shape (id, name, avatar) is identical.
 */
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
