const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const CHAT_MODEL = Deno.env.get('GEMINI_CHAT_MODEL') ?? 'gemini-3.1-flash-lite';

export const EMBED_MODEL = Deno.env.get('GEMINI_EMBED_MODEL') ?? 'gemini-embedding-001';

export const EMBED_DIMENSIONS = 1536;

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

function requireApiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    throw new GeminiError('GEMINI_API_KEY is not set on the function', 500);
  }
  return key;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  return text.slice(0, 500);
}

type GenerateOptions = {
  system?: string;
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
};

export async function generateContent(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const key = requireApiKey();
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.4,
  };
  if (options.jsonSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = options.jsonSchema;
  }

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };
  if (options.system) {
    body.systemInstruction = { parts: [{ text: options.system }] };
  }

  const res = await fetch(`${GEMINI_BASE}/${CHAT_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new GeminiError(`Gemini generateContent failed: ${await readError(res)}`, res.status);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
  if (!text) {
    throw new GeminiError('Gemini returned an empty response', 502);
  }
  return text;
}

export type EmbedTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export async function embedContent(text: string, taskType: EmbedTaskType): Promise<number[]> {
  const key = requireApiKey();
  const res = await fetch(`${GEMINI_BASE}/${EMBED_MODEL}:embedContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBED_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    throw new GeminiError(`Gemini embedContent failed: ${await readError(res)}`, res.status);
  }

  const data = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBED_DIMENSIONS) {
    throw new GeminiError(
      `Gemini returned ${values?.length ?? 0} dims, expected ${EMBED_DIMENSIONS}`,
      502
    );
  }
  return values;
}
