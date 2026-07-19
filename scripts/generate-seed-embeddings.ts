/**
 * One-time backfill of ticket embeddings for semantic search.
 *
 * Reads the seeded tickets from the fixtures, embeds each with Gemini
 * (gemini-embedding-001 @ 1536 dims, RETRIEVAL_DOCUMENT), and writes one
 * `update public.tickets set embedding = ...` per ticket into
 * `supabase/seed-embeddings.sql`. That file is loaded after seed.sql on `db reset`, so
 * once this has run the vectors are committed data — resets and fresh checkouts cost zero
 * API calls forever.
 *
 * Three properties make it safe against the free-tier limits:
 *  - Resumable: already-embedded ticket ids are read back from the output file and
 *    skipped, and each result is flushed to disk the moment it returns. A crash at
 *    ticket 400 costs only the missing 100 on the next run, not a fresh 500 that would
 *    blow the 1,000/day embedding budget.
 *  - Token-throttled: TPM (30K), not RPM, is the binding limit. The pacer sleeps to keep
 *    the trailing minute under the cap. No parallelism — nothing to gain, a 429 to lose.
 *  - Backs off on 429 / RESOURCE_EXHAUSTED rather than crashing.
 *
 * Usage: GEMINI_API_KEY=... bun run seed:embed
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { ticketRows } from '../src/mocks/fixtures';

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? 'gemini-embedding-001';
const EMBED_DIMENSIONS = 1536;
const TOKENS_PER_MINUTE = 30_000;
const MIN_REQUEST_INTERVAL_MS = 700; // ≥ RPM 100 with margin.
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

/** Ticket ids already present in the output file, so a re-run skips them. */
function loadDoneIds(): Set<string> {
  if (!existsSync(outputPath)) return new Set();
  const text = readFileSync(outputPath, 'utf8');
  const ids = [...text.matchAll(/where id = '([0-9a-f-]+)'/g)].map((match) => match[1]);
  return new Set(ids);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Rough token estimate; the API bills real tokens, this only paces requests. */
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

    // Token pacer: if this request would push the trailing minute over the cap, wait for
    // the window to roll over before sending it.
    if (tokensThisWindow + tokens > TOKENS_PER_MINUTE) {
      const wait = 60_000 - (Date.now() - windowStart);
      if (wait > 0) await sleep(wait);
      windowStart = Date.now();
      tokensThisWindow = 0;
    }

    const vector = await embed(text);
    tokensThisWindow += tokens;

    // Flush immediately — this is what makes a crash resumable.
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
