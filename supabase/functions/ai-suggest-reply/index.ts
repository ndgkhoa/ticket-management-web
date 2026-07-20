import { generateContent, GeminiError } from '../_shared/gemini.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

type ThreadMessage = { author?: string; type?: string; body?: string };

type ReplyRequest = {
  subject?: string;
  messages?: ThreadMessage[];
  cannedResponses?: string[];
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
