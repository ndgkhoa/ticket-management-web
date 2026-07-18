# AI Features & Semantic Search

AI-assisted help desk via **Supabase Edge Functions + Gemini**, plus **semantic ticket
search** with `pgvector`. Every secret stays server-side; the browser never holds the AI
key. The whole feature is additive — the app is fully usable with no AI at all.

## Architecture

```
Browser ──► supabase.functions.invoke(...) ──► Edge Function (Deno) ──► Gemini REST
   │                                              (GEMINI_API_KEY server-side)
   └──► supabase.rpc('match_tickets' | 'similar_tickets') ──► Postgres (pgvector, RLS)
```

- **Edge functions** (`supabase/functions/`), all reading `GEMINI_API_KEY` from the
  function environment:
  - `ai-triage` — subject/description → suggested priority (+ category from a supplied
    list). JSON-constrained output.
  - `ai-suggest-reply` — thread (+ canned responses) → a draft agent reply. Non-streaming.
  - `ai-summarize` — thread → short summary.
  - `embed-ticket` — reads the ticket via the service role, embeds it
    (`gemini-embedding-001`, 1536 dims, `RETRIEVAL_DOCUMENT`), writes `tickets.embedding`.
    Called fire-and-forget after create.
  - `embed-query` — embeds a search query (`RETRIEVAL_QUERY`) and returns the vector.
- **RPCs** (`supabase/migrations/*_pgvector_semantic_search.sql`), both `security invoker`
  so RLS scopes results to what the caller may already see:
  - `match_tickets(query_embedding, match_count, similarity_threshold)` — free-text
    semantic search. The client embeds the query via `embed-query`, then calls this so the
    search runs under the user's own RLS (not the edge function's service role).
  - `similar_tickets(p_ticket_id, match_count)` — neighbours of a ticket's stored
    embedding; pure DB lookup, no API call.

### Why Gemini (not Claude)

Anthropic publishes **no embeddings endpoint** (their docs point to Voyage AI), and
semantic search needs embeddings. Gemini covers both chat and embeddings on one free-tier
key, so it does the whole phase. A Claude Pro subscription is a chat product, not API
access, and could not power these functions regardless.

### Embedding dimension: 1536, not 3072

`gemini-embedding-001` defaults to 3072 dims, but pgvector's `hnsw`/`ivfflat` indexes cap
at 2000 — a 3072-dim column stores and queries fine on a handful of rows, then fails to
index at demo size. Gemini embeddings are Matryoshka, so `output_dimensionality: 1536` is
lossless-by-design and fits the index. Column is `vector(1536)`; query and document
embeddings **must** use the same model + dimension.

## Fallback & availability

- `VITE_AI_ENABLED` (`true`/`false`) hides the AI affordances up front — the key is
  server-side, so the client can't detect it. Independent of that, every AI call degrades
  gracefully: on error the UI toasts and stays usable, and Smart search falls back to
  keyword search (Postgres FTS, always available from Phase 06).
- MSW mode (`VITE_API_MODE=msw`) mocks all AI paths, so the static demo and the entire
  test suite run with **zero API calls and no key**.

## Cost & rate limits (free tier)

Quotas are **per Google Cloud project**, unpublished in the docs, and change without
notice — read them at `aistudio.google.com/rate-limit`, and use a dedicated project so
nothing else competes for the quota.

| Model                          | Purpose              | Notes                                                                                      |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| **Gemini 3.1 Flash Lite**      | triage/reply/summary | 500 RPD — the only free text model with a usable daily quota (25× the 20 RPD alternatives) |
| **gemini-embedding-001** @1536 | embeddings           | ~1,000 RPD, 30K TPM (TPM is the binding limit)                                             |

Pin the chat model to a **stable id** (`GEMINI_CHAT_MODEL`), not a `*-latest` alias.
Steady-state usage is far below these limits by design: the demo and CI make zero AI
calls; only hand-driven dev traffic hits the API.

**Free tier uses submitted content to improve Google's products.** Acceptable here because
all data is seeded fake tickets. **If this app ever handles real user tickets, move to a
paid tier or another provider.**

## Seeding embeddings (one-time)

`bun run seed:embed` (needs `GEMINI_API_KEY` + a running database) backfills embeddings for
the ~500 seeded tickets into `supabase/seed-embeddings.sql`, loaded after `seed.sql` on
`db reset`. It is:

- **Resumable** — already-embedded ids are read back and skipped; each vector is flushed to
  disk immediately, so a crash costs only the missing few, not a fresh 500 (which would
  blow the daily budget).
- **Token-throttled** — paced under 30K TPM (the binding limit), no parallelism.
- **429-tolerant** — backs off on `RESOURCE_EXHAUSTED`.

Kept separate from `seed.sql` because that file is generated from fixtures and CI-checked
(`seed:check`); live-model vectors can't live there without breaking the check. Once run,
the vectors are committed data — resets and fresh checkouts cost zero API calls.

## Known limitations (follow-ups)

- **No server-side rate limiting / role gating on the AI functions.** All functions require
  a valid JWT (`verify_jwt` default), but any authenticated user can call them, so one user
  can exhaust the shared free-tier quota. Impact is bounded — AI degrades to keyword search,
  no data is exposed — and acceptable for a single-tenant demo on seeded data. Before real
  multi-tenant use: add per-user rate limiting, and gate the agent-only functions
  (`ai-suggest-reply`, `ai-summarize`) on the agent role from the JWT claims.
- `embed-ticket` returns 404 vs 200 for unknown ids (a minor existence oracle); low risk
  over the UUID space, closed by the role gate above.

## Setup

1. Get a key from Google AI Studio; set `GEMINI_API_KEY` as a Supabase secret
   (`supabase secrets set GEMINI_API_KEY=...`) and in your shell for local functions/seed.
2. Deploy the functions (`supabase functions deploy`).
3. Optionally run `bun run seed:embed` to make semantic search return results on the seed.
4. Set `VITE_AI_ENABLED=false` on any deploy without a key.
