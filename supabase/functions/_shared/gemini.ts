// Thin Gemini REST client shared by every AI edge function.
//
// REST rather than an SDK: the two calls used here (generateContent, embedContent) are a
// couple of fetches, and a vendored SDK is more surface than that earns. The API key is
// read from the function environment (`GEMINI_API_KEY`, a Supabase secret) and never
// leaves the server.
//
// Model IDs are env-overridable. The chat model MUST be pinned to a stable ID in
// production (aliases like `*-latest` move under you); `GEMINI_CHAT_MODEL` is how you pin
// it per environment. The embedding model `gemini-embedding-001` is already a stable ID.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Chat model — Gemini 3.1 Flash Lite. Pinned to the stable id, NOT the
 * `gemini-flash-lite-latest` alias: that alias resolves to Gemini 2.5 Flash, which is
 * capped at 20 requests/day and gets exhausted in one testing session. `gemini-3.1-flash-lite`
 * carries the 500 RPD quota this feature was designed around. Override per environment via
 * GEMINI_CHAT_MODEL, but confirm the replacement's RPD before switching.
 */
export const CHAT_MODEL = Deno.env.get('GEMINI_CHAT_MODEL') ?? 'gemini-3.1-flash-lite';

/** Embedding model. Stable ID; do not change without rebuilding every stored vector. */
export const EMBED_MODEL = Deno.env.get('GEMINI_EMBED_MODEL') ?? 'gemini-embedding-001';

/**
 * Embedding dimension. 1536, not the model's 3072 default: pgvector's hnsw index caps at
 * 2000 dims, and Gemini embeddings are Matryoshka so truncating to 1536 is lossless by
 * design. Query and document embeddings MUST use this same value or ranking breaks.
 */
export const EMBED_DIMENSIONS = 1536;

export class GeminiError extends Error {
  constructor(
    message: string,
    /** HTTP status to surface to the client — 429 gets a real quota fallback. */
    readonly status: number
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

function requireApiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) {
    // A misconfigured deploy must fail loudly, not silently return empty AI results.
    throw new GeminiError('GEMINI_API_KEY is not set on the function', 500);
  }
  return key;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  return text.slice(0, 500);
}

type GenerateOptions = {
  /** System-style instruction prepended to the prompt. */
  system?: string;
  /** When set, forces the model to return JSON matching this schema. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
};

/**
 * One-shot text generation. With `jsonSchema` the model is constrained to JSON output
 * (`responseMimeType: application/json`), which is what lets the triage function get a
 * clean `{ priority, category }` instead of prose to parse.
 */
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

/** Task type distinguishes stored-document embeddings from query embeddings — they are
 * asymmetric, and mixing them silently degrades ranking rather than erroring. */
export type EmbedTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/**
 * Embed a single piece of text to a 1536-dim vector. `taskType` must match the use:
 * `RETRIEVAL_DOCUMENT` when storing a ticket, `RETRIEVAL_QUERY` when searching.
 */
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
