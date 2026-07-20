import { generateContent, GeminiError } from '../_shared/gemini.ts';
import { handlePreflight, jsonResponse } from '../_shared/cors.ts';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

type TriageRequest = {
  subject?: string;
  description?: string;
  categories?: string[];
};

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const {
      subject = '',
      description = '',
      categories = [],
    }: TriageRequest = await req.json().catch(() => ({}));

    if (!subject.trim()) {
      return jsonResponse({ error: 'subject is required' }, 400);
    }

    const categoryLine =
      categories.length > 0
        ? `Choose the single best category from this list, or null if none fit: ${categories.join(', ')}.`
        : 'Leave category null.';

    const prompt = [
      'You are a help desk triage assistant. Classify the ticket below.',
      `Pick a priority from: ${PRIORITIES.join(', ')}.`,
      categoryLine,
      'Give a one-sentence reason.',
      '',
      `Subject: ${subject}`,
      `Description: ${description}`,
    ].join('\n');

    const raw = await generateContent(prompt, {
      temperature: 0.2,
      jsonSchema: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: PRIORITIES },
          category: { type: 'string', nullable: true },
          reason: { type: 'string' },
        },
        required: ['priority', 'reason'],
      },
    });

    return jsonResponse(JSON.parse(raw));
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 500;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
