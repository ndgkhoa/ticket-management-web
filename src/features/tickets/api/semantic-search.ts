import { queryOptions, useQuery } from '@tanstack/react-query';

import { supabase } from '~/lib/supabase';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import { invokeAiFunction, isAiEnabled } from '~/features/tickets/api/ai-client';
import { aiEmbedQueryResultSchema } from '~/features/tickets/schemas/ai-schemas';
import {
  parseTicketMatches,
  type TicketMatch,
} from '~/features/tickets/schemas/semantic-result-schema';

const SEARCH_MATCH_COUNT = 20;
const SIMILAR_MATCH_COUNT = 5;

/**
 * Semantic ticket search: embed the query server-side (the edge function holds the key),
 * then run the `match_tickets` RPC as the caller so RLS still scopes the results. The two
 * halves are split — embed vs match — precisely so the search runs under the user's own
 * row-level security rather than the edge function's service role.
 */
export const semanticSearchApi = {
  search: async (query: string): Promise<TicketMatch[]> => {
    const { embedding } = await invokeAiFunction(
      'embed-query',
      { query },
      aiEmbedQueryResultSchema
    );
    const { data } = await supabase
      .rpc('match_tickets', {
        // pgvector accepts the JSON-array text form of the vector.
        query_embedding: JSON.stringify(embedding),
        match_count: SEARCH_MATCH_COUNT,
      })
      .throwOnError();
    return parseTicketMatches(data);
  },

  /** Tickets similar to an existing one — reads its stored embedding, so no API call. */
  similar: async (ticketId: string): Promise<TicketMatch[]> => {
    const { data } = await supabase
      .rpc('similar_tickets', { p_ticket_id: ticketId, match_count: SIMILAR_MATCH_COUNT })
      .throwOnError();
    return parseTicketMatches(data);
  },
};

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
