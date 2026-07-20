import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { profileLookupApi } from '~/features/tickets/api/profile-lookup-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import type { Assignee } from '~/features/tickets/schemas/assignee-schema';

export const useProfileLookup = (ids: string[]) => {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);

  const query = useQuery({
    queryKey: [...ticketKeys.all, 'profiles', sorted],
    queryFn: () => profileLookupApi.byIds(sorted),
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(
    () => new Map<string, Assignee>((query.data ?? []).map((profile) => [profile.id, profile])),
    [query.data]
  );
};
