import { queryOptions, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/stores/auth';
import { cannedResponseKeys } from '~/features/admin/canned-responses/constants/canned-response-keys';
import {
  CANNED_RESPONSE_COLUMNS,
  cannedResponseSchema,
} from '~/features/admin/canned-responses/schemas/canned-response-schema';

/**
 * The canned-response library as the ticket workflow consumes it — the whole set, title-ordered,
 * for the composer picker and as AI-draft context. Distinct from the admin feature's paginated
 * list (that one is a searchable table); this is a small bounded read. The key is nested under
 * the shared `canned_responses` root, so an admin edit invalidates this too.
 */
const cannedResponseListForTickets = () =>
  queryOptions({
    queryKey: [...cannedResponseKeys.all, 'library'],
    queryFn: async () => {
      const { data } = await supabase
        .from('canned_responses')
        .select(CANNED_RESPONSE_COLUMNS)
        .order('title', { ascending: true })
        .throwOnError();
      return z.array(cannedResponseSchema).parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });

/**
 * Canned responses for the composer + AI. Gated on `canned.read`: only holders fetch them
 * (customers lack the permission, and RLS would return nothing anyway), so a read-only client
 * never pulls the library.
 */
export const useCannedResponses = () => {
  const canRead = useAuthStore((state) => state.hasPermission('canned.read'));
  return useQuery({ ...cannedResponseListForTickets(), enabled: canRead });
};
