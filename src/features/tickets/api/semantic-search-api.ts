import { supabase } from '~/lib/supabase';
import { invokeAiFunction } from '~/features/tickets/api/ai-client';
import { aiEmbedQueryResultSchema } from '~/features/tickets/schemas/ai-schemas';
import {
  parseTicketMatches,
  type TicketMatch,
} from '~/features/tickets/schemas/semantic-result-schema';

const SEARCH_MATCH_COUNT = 20;
const SIMILAR_MATCH_COUNT = 5;

export const semanticSearchApi = {
  search: async (query: string): Promise<TicketMatch[]> => {
    const { embedding } = await invokeAiFunction(
      'embed-query',
      { query },
      aiEmbedQueryResultSchema
    );
    const { data } = await supabase
      .rpc('match_tickets', {
        query_embedding: JSON.stringify(embedding),
        match_count: SEARCH_MATCH_COUNT,
      })
      .throwOnError();
    return parseTicketMatches(data);
  },

  similar: async (ticketId: string): Promise<TicketMatch[]> => {
    const { data } = await supabase
      .rpc('similar_tickets', { p_ticket_id: ticketId, match_count: SIMILAR_MATCH_COUNT })
      .throwOnError();
    return parseTicketMatches(data);
  },
};
