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
