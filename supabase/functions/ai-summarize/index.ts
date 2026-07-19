// ai-summarize — condense a long ticket thread into a short summary an agent can read
// at a glance. Model: Gemini 3.1 Flash Lite.

import { generateContent, GeminiError } from '../_shared/gemini.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

type ThreadMessage = { author?: string; type?: string; body?: string };

type SummarizeRequest = {
  subject?: string;
  messages?: ThreadMessage[];
};

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { subject = '', messages = [] }: SummarizeRequest = await req.json().catch(() => ({}));

    if (messages.length === 0) {
      return jsonResponse({ error: 'messages are required' }, 400);
    }

    const thread = messages
      .map((message) => {
        const role =
          message.type === 'internal_note' ? 'Internal note' : (message.author ?? 'User');
        return `${role}: ${toPlainText(message.body ?? '')}`;
      })
      .join('\n');

    const prompt = [
      `Ticket subject: ${subject}`,
      '',
      'Conversation:',
      thread,
      '',
      'Summarize this ticket in 2-3 sentences: the customer issue, what has been tried,',
      'and the current state. Return only the summary.',
    ].join('\n');

    const summary = await generateContent(prompt, {
      system: 'You summarize help desk tickets for support agents.',
      temperature: 0.3,
    });

    return jsonResponse({ summary });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
