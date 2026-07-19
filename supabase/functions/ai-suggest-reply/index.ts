// ai-suggest-reply — draft an agent reply from the ticket thread and any canned
// responses the agent has on hand. Model: Gemini 3.1 Flash Lite. Non-streaming: the
// whole draft comes back in one response, which keeps the client and the mock simple.
//
// The thread is sent by the client, which already holds it under RLS — this function
// generates text, it does not read the database.

import { generateContent, GeminiError } from '../_shared/gemini.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

type ThreadMessage = { author?: string; type?: string; body?: string };

type ReplyRequest = {
  subject?: string;
  messages?: ThreadMessage[];
  cannedResponses?: string[];
};

/** Strip HTML tags so the model reads plain text, not Tiptap markup. */
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
    const {
      subject = '',
      messages = [],
      cannedResponses = [],
    }: ReplyRequest = await req.json().catch(() => ({}));

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

    const cannedBlock =
      cannedResponses.length > 0
        ? `\n\nYou may adapt one of these canned responses if relevant:\n${cannedResponses
            .map((response) => `- ${toPlainText(response)}`)
            .join('\n')}`
        : '';

    const prompt = [
      `Ticket subject: ${subject}`,
      '',
      'Conversation so far:',
      thread,
      cannedBlock,
      '',
      'Write the next reply as the support agent. Be helpful, concise and professional.',
      'Return only the reply text, no preamble.',
    ].join('\n');

    const draft = await generateContent(prompt, {
      system: 'You are an experienced help desk support agent.',
      temperature: 0.6,
    });

    return jsonResponse({ draft });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
