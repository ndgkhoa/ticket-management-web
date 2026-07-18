import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { assigneeSchema } from '~/features/tickets/schemas/assignee-schema';

/**
 * The agents a ticket may be assigned to — the option source for the list's assignee
 * filter. Comes from the `assignable_agents()` RPC (profiles holding `ticket.update`)
 * rather than the full profiles table: a customer isn't an assignee, and the set is
 * small and bounded, so it fetches once and paginates client-side in the facet.
 */
export const assigneeApi = {
  list: async () => {
    const { data } = await supabase.rpc('assignable_agents').throwOnError();
    return z.array(assigneeSchema).parse(data ?? []);
  },
};
