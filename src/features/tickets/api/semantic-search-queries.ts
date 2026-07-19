import { queryOptions, useQuery } from '@tanstack/react-query';

import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import { isAiEnabled } from '~/features/tickets/api/ai-client';
import { semanticSearchApi } from '~/features/tickets/api/semantic-search-api';

/**
 * Smart-search results for the list. Enabled only when AI is on and there is a query, so
 * the keyword list stays the default and semantic search costs nothing until asked for.
 */
export const useSemanticSearch = (query: string | undefined, enabled: boolean) =>
  useQuery(
    queryOptions({
      queryKey: ticketKeys.semantic(query ?? ''),
      queryFn: () => semanticSearchApi.search(query ?? ''),
      enabled: enabled && isAiEnabled && Boolean(query),
    })
  );

/** "Similar tickets" for the detail sidebar. */
export const useSimilarTickets = (ticketId: string) =>
  useQuery(
    queryOptions({
      queryKey: ticketKeys.similar(ticketId),
      queryFn: () => semanticSearchApi.similar(ticketId),
      enabled: isAiEnabled,
    })
  );
