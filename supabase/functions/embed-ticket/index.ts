// embed-ticket — generate the semantic-search embedding for a ticket and store it in
// `tickets.embedding`. Called (fire-and-forget) after a ticket is created or its
// subject/description changes. Model: gemini-embedding-001 @ 1536 dims,
// taskType RETRIEVAL_DOCUMENT.
//
// The subject/description are read from the database with the service-role key rather
// than trusted from the request body: the caller may not hold `ticket.update` (a
// customer creating their own ticket does not), so the write cannot run as the caller,
// and the text it embeds must be the row's real content. The request carries only the
// ticket id.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { embedContent, GeminiError } from '../_shared/gemini.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

type EmbedRequest = { ticketId?: string };

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { ticketId }: EmbedRequest = await req.json().catch(() => ({}));
    if (!ticketId) {
      return jsonResponse({ error: 'ticketId is required' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: ticket, error: readError } = await admin
      .from('tickets')
      .select('subject, description')
      .eq('id', ticketId)
      .single();

    if (readError || !ticket) {
      return jsonResponse({ error: readError?.message ?? 'ticket not found' }, 404);
    }

    const text = `${ticket.subject}\n\n${ticket.description ?? ''}`.trim();
    const embedding = await embedContent(text, 'RETRIEVAL_DOCUMENT');

    const { error: updateError } = await admin
      .from('tickets')
      // pgvector's input parser wants the `[1,2,3]` text literal; a raw JS array serializes
      // to `{1,2,3}` over PostgREST and fails. Same serialization the search RPC uses.
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', ticketId);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
