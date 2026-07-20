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
