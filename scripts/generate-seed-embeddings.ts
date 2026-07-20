import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { ticketRows } from '../src/mocks/fixtures';

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';
const EMBED_DIMENSIONS = 1536;
const TOKENS_PER_MINUTE = 30_000;
const MIN_REQUEST_INTERVAL_MS = 700;
const MAX_RETRIES = 5;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is required. Aborting so no half-run wastes quota.');
  process.exit(1);
}

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../supabase/seed-embeddings.sql'
);

const HEADER = `-- GENERATED FILE — DO NOT EDIT BY HAND.
--
-- One-time semantic embeddings for the seeded tickets, produced by \`bun run seed:embed\`
-- and loaded after seed.sql on \`supabase db reset\`. These vectors are committed data.
`;

function loadDoneIds(): Set<string> {
  if (!existsSync(outputPath)) return new Set();
  const text = readFileSync(outputPath, 'utf8');
  const ids = [...text.matchAll(/where id = '([0-9a-f-]+)'/g)].map((match) => match[1]);
  return new Set(ids);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${apiKey}`;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBED_DIMENSIONS,
      }),
    });

    if (res.status === 429) {
      const backoff = 2 ** attempt * 5_000;
      console.warn(`  429 RESOURCE_EXHAUSTED — backing off ${backoff / 1000}s`);
      await sleep(backoff);
      continue;
    }
    if (!res.ok) throw new Error(`embedContent ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const json = (await res.json()) as { embedding?: { values?: number[] } };
    const values = json.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBED_DIMENSIONS) {
      throw new Error(`expected ${EMBED_DIMENSIONS} dims, got ${values?.length ?? 0}`);
    }
    return values;
  }
  throw new Error('exhausted retries against 429');
}

async function main() {
  const done = loadDoneIds();
  const pending = ticketRows.filter((ticket) => !done.has(ticket.id));

  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8').trim() === '') {
    writeFileSync(outputPath, HEADER, 'utf8');
  }
  console.log(`${done.size} already embedded, ${pending.length} to go.`);

  let windowStart = Date.now();
  let tokensThisWindow = 0;

  for (const [index, ticket] of pending.entries()) {
    const text = `${ticket.subject}\n\n${ticket.description ?? ''}`.trim();
    const tokens = estimateTokens(text);

    if (tokensThisWindow + tokens > TOKENS_PER_MINUTE) {
      const wait = 60_000 - (Date.now() - windowStart);
      if (wait > 0) await sleep(wait);
      windowStart = Date.now();
      tokensThisWindow = 0;
    }

    const vector = await embed(text);
    tokensThisWindow += tokens;

    appendFileSync(
      outputPath,
      `update public.tickets set embedding = '[${vector.join(',')}]' where id = '${ticket.id}';\n`,
      'utf8'
    );

    if ((index + 1) % 25 === 0 || index === pending.length - 1) {
      console.log(`  ${index + 1}/${pending.length} embedded`);
    }
    await sleep(MIN_REQUEST_INTERVAL_MS);
  }

  console.log('Done. Commit supabase/seed-embeddings.sql.');
}

await main();
