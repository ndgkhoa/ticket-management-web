import { queryOptions, useQuery } from '@tanstack/react-query';

import { useAuthStore } from '~/stores/auth';
import { cannedResponseKeys } from '~/features/admin/canned-responses/constants/canned-response-keys';
import { cannedResponseApi } from '~/features/tickets/api/canned-response-api';

/**
 * The canned-response library for the composer picker + AI-draft context. Key is nested under
 * the shared `canned_responses` root so an admin create/edit/delete invalidates this too.
 */
const cannedResponseLibraryQuery = () =>
  queryOptions({
    queryKey: [...cannedResponseKeys.all, 'library'],
    queryFn: cannedResponseApi.list,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Canned responses for the composer + AI. Gated on `canned.read`: only holders fetch them
 * (customers lack the permission, and RLS would return nothing anyway), so a read-only client
 * never pulls the library.
 */
export const useCannedResponses = () => {
  const canRead = useAuthStore((state) => state.hasPermission('canned.read'));
  return useQuery({ ...cannedResponseLibraryQuery(), enabled: canRead });
};
