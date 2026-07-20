import { queryOptions, useQuery } from '@tanstack/react-query';

import { useAuthStore } from '~/stores/auth';
import { cannedResponseKeys } from '~/features/admin/canned-responses/constants/canned-response-keys';
import { cannedResponseApi } from '~/features/tickets/api/canned-response-api';

const cannedResponseLibraryQuery = () =>
  queryOptions({
    queryKey: [...cannedResponseKeys.all, 'library'],
    queryFn: cannedResponseApi.list,
    staleTime: 5 * 60 * 1000,
  });

export const useCannedResponses = () => {
  const canRead = useAuthStore((state) => state.hasPermission('canned.read'));
  return useQuery({ ...cannedResponseLibraryQuery(), enabled: canRead });
};
