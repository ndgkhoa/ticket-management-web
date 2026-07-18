// embed-query — embed a free-text search query and return the vector. The client then
// passes it to the `match_tickets` RPC, which runs the similarity search as the caller
// so RLS still decides which tickets are visible.
//
// Kept separate from embed-ticket because the task type differs: query embeddings use
// RETRIEVAL_QUERY, document embeddings use RETRIEVAL_DOCUMENT — they are asymmetric, and
// this function must never write to the database.

import { embedContent, EMBED_DIMENSIONS, GeminiError } from '../_shared/gemini.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

type QueryRequest = { query?: string };

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { query = '' }: QueryRequest = await req.json().catch(() => ({}));
    if (!query.trim()) {
      return jsonResponse({ error: 'query is required' }, 400);
    }

    const embedding = await embedContent(query, 'RETRIEVAL_QUERY');
    return jsonResponse({ embedding, dimensions: EMBED_DIMENSIONS });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
