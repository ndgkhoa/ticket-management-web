import { queryOptions, useQuery } from '@tanstack/react-query';

import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import { isAiEnabled } from '~/features/tickets/api/ai-client';
import { semanticSearchApi } from '~/features/tickets/api/semantic-search-api';

export const useSemanticSearch = (query: string | undefined, enabled: boolean) =>
  useQuery(
    queryOptions({
      queryKey: ticketKeys.semantic(query ?? ''),
      queryFn: () => semanticSearchApi.search(query ?? ''),
      enabled: enabled && isAiEnabled && Boolean(query),
    })
  );

export const useSimilarTickets = (ticketId: string) =>
  useQuery(
    queryOptions({
      queryKey: ticketKeys.similar(ticketId),
      queryFn: () => semanticSearchApi.similar(ticketId),
      enabled: isAiEnabled,
    })
  );
