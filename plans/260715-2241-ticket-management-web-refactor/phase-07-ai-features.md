# Phase 07 — AI Features + Semantic Search

**Priority:** P2 (differentiator) · **Status:** ⬜ todo · **Depends:** Phase 06

## Overview

The standout CV feature: AI-assisted help desk via **Supabase Edge Functions + Gemini API**, plus **semantic ticket search** with `pgvector`. Keeps all secrets server-side (edge function), never in the browser.

### Provider: Gemini (decided 2026-07-15 — verified against the vendors' own docs)

- **Claude cannot do this phase alone.** Anthropic publishes no embeddings endpoint — their docs state plainly _"Anthropic does not offer its own embedding model"_ and point to Voyage AI. The original plan's `embed-ticket` function had no API to call. Any provider choice here had to solve embeddings separately; Gemini solves both halves with one key.
- **Free tier covers everything used here** (chat + embeddings), so CI, demo, and dev cost nothing.

### Free-tier quotas — read from the project's AI Studio page, 2026-07-16

Google no longer publishes these in the docs; they're per-**project** (not per-key) and visible only at `aistudio.google.com/rate-limit`. Re-check before implementing — these are one account's numbers on one day.

| Model                                | RPM | TPM  | **RPD** |
| ------------------------------------ | --- | ---- | ------- |
| Gemini 3.5 Flash                     | 5   | 250K | **20**  |
| Gemini 3 Flash                       | 5   | 250K | 20      |
| Gemini 2.5 Flash Lite                | 10  | 250K | 20      |
| **Gemini 3.1 Flash Lite ← use this** | 15  | 250K | **500** |
| Gemini Embedding 1 / 2               | 100 | 30K  | 1,000   |

**Chat model: 3.1 Flash Lite. Not 3.5 Flash — that has a 20-requests-per-_day_ ceiling** and would be exhausted in one afternoon of clicking the triage button. Among the free text models, 3.1 Flash Lite is the only one with a usable daily quota (500 RPD, 25× every alternative), so this isn't a trade-off — it's the one viable option. It's also the right size for the work: sorting a ticket into 4 priorities and summarizing a short thread does not need a frontier model. **Get the exact stable model ID from the models page at implementation time** — do not copy an alias like `gemini-flash-lite-latest` into production code (aliases move under you; pin the stable ID).

**Use a dedicated Google Cloud project for this app.** Quotas are per-project, so sharing a project with any other Gemini usage means the two compete — and the one that runs out first will be the one you need.

**Steady-state usage is nowhere near these limits**, by design: the public demo runs MSW (0 AI calls) and CI mocks AI (0 calls). Only hand-driven dev traffic hits the API — tens of calls a day against a 500/day ceiling.

- **Known trade-off, accepted for this project:** Gemini's free tier states _"Content used to improve our products: Yes"_ (paid tier: no). Every ticket here is seeded fake data, so nothing real is exposed. **If this app ever touches real user tickets, this must move to a paid tier or another provider** — record it in the ADR so the decision isn't silently inherited.

## Requirements

- **Edge Functions (Deno):** all call Gemini with the key held server-side (`GEMINI_API_KEY` as a Supabase secret — never in the client bundle, never in `VITE_*`).
  - `ai-triage` — suggest category + priority for a new ticket. Model: **Gemini 3.1 Flash Lite**.
  - `ai-suggest-reply` — draft an agent reply from ticket thread + optional canned responses. Model: **Gemini 3.1 Flash Lite**.
  - `ai-summarize` — summarize long ticket threads. Model: **Gemini 3.1 Flash Lite**.
  - `embed-ticket` — generate embedding on ticket create/update → store in `tickets.embedding`. Model: **`gemini-embedding-001`**, `taskType: RETRIEVAL_DOCUMENT`.

### Seeding embeddings — one-time, resumable, token-throttled

The only burst in the whole project: ~500 seeded tickets × 1 embedding. It fits the free tier, but only if the script respects three things.

- **Embed once, then never again.** The seed script writes the resulting vectors straight into `supabase/seed.sql`. After that first run the embeddings are committed data — resetting the DB, re-seeding, or onboarding a new machine costs zero API calls, forever.
- **TPM (30K) is the binding limit, not RPM.** 100 RPM would let 500 requests through in ~5 minutes, but 500 tickets × ~150 tokens ≈ 75K tokens needs ≥3 minutes at 30K tokens/min — longer with real descriptions. **Throttle by tokens, not by request count**, and don't parallelize it; there's nothing to gain and a 429 to lose.
- **Make it resumable — this is the one that bites.** Seeding 500 tickets spends half the 1,000/day embedding budget. If the script dies at ticket 400 and you just re-run it, the second pass hits the daily ceiling and you are blocked until tomorrow. Write each embedding to disk the moment it returns and skip anything already present, so a retry costs only what's missing.
- Handle `RESOURCE_EXHAUSTED` (429) with backoff rather than crashing — a mid-run failure that loses 400 embeddings is exactly the scenario above.

### Embedding dimension — get this right in the migration or rebuild the table

- **`gemini-embedding-001` defaults to 3072 dimensions. pgvector cannot index that.** `hnsw` and `ivfflat` both cap at **2000 dimensions** (the `vector` type itself allows 16000 — the _index_ is the limit). A 3072-dim column stores fine and queries fine on tiny data, so this passes locally on 30 seeded tickets and only reveals itself as a full sequential scan at demo size, or as an outright error when you try to create the index.
- **Use `output_dimensionality: 1536`.** Gemini embeddings are Matryoshka (MRL), so truncating is lossless-by-design — 768/1536/3072 are the vendor-recommended sizes, and 1536 is the largest that fits under pgvector's index cap. Column: `vector(1536)`.
- Query side must use the **same model and the same dimension**, with `taskType: RETRIEVAL_QUERY` (document vs query embeddings are asymmetric — using `RETRIEVAL_DOCUMENT` for the query silently degrades ranking rather than erroring).
- Escape hatch if 3072 is ever genuinely needed: `halfvec` indexes up to 4000 dims. Out of scope — noted so it isn't rediscovered.
- **Semantic search:** query embedding → `pgvector` cosine similarity RPC → ranked related tickets (dedupe/"similar tickets" panel).
  - **Additive, never a replacement.** Phase 06 already ships keyword search (Postgres FTS) as the list's default. Semantic search is a "Smart search" toggle on the same `q` param — same URL contract, same DataTable, different backend path. If the AI key is absent or the edge function errors, the toggle is disabled/falls back to keyword search; search never becomes unavailable.
- **UI:** AI suggestion panel in ticket detail (accept/edit draft), auto-triage hint on create, "similar tickets" sidebar, semantic search box in list.
- Guardrails: rate-limit, graceful fallback when AI unavailable, streaming where useful, cost note in docs.

## Related code files

AI is **not** a new bucket inside `features/tickets/` — it obeys the closed feature taxonomy (`code-standards.md`). No `features/tickets/ai/**`.

- Create: `supabase/functions/{ai-triage,ai-suggest-reply,ai-summarize,embed-ticket}/index.ts`, `supabase/migrations/*_pgvector_search.sql` (RPC).
- Frontend, placed by _what it is_, not by "it's AI":
  - `src/features/tickets/api/semantic-search.ts` — RPC call + `useSemanticSearch` (server state → `api/`, colocated with its fetcher).
  - `src/features/tickets/api/{triage-ticket,suggest-reply,summarize-ticket}.ts` — edge-function calls + their mutation hooks.
  - `src/features/tickets/components/ai-*.tsx` — `ai-suggestion-panel`, `ai-triage-hint`, `similar-tickets-panel`. Prefix names the concern; the folder stays flat.
  - `src/features/tickets/schemas/ai-*.ts` — Zod schemas for the edge-function responses (**validate them: LLM output is untrusted input, and an edge function can return a shape you didn't expect**) + inferred types.
- Modify: ticket create/detail to call AI hooks; MSW handlers to mock AI responses for tests/demo.

## Implementation steps

1. Add `vector(1536)` embedding column + hnsw index + similarity RPC in migration. (1536, not the 3072 default — see above.)
2. Build `embed-ticket` edge function (`gemini-embedding-001`, `output_dimensionality: 1536`, `taskType: RETRIEVAL_DOCUMENT`); call on ticket create/update. Then run the one-time seed-embedding script (resumable + token-throttled) and commit the vectors into `seed.sql`.
3. Build triage/suggest-reply/summarize edge functions (Gemini 3.1 Flash Lite, `GEMINI_API_KEY` as a Supabase secret).
4. Frontend hooks + AI panels (accept/edit), streaming reply where helpful.
5. Semantic search UI (list + similar-tickets sidebar).
6. MSW mock AI handlers so demo/tests run without API cost.
7. Docs: architecture + cost/rate-limit notes.

## Todo

- [ ] Dedicated Google Cloud project + key; confirm real quotas + stable model IDs in AI Studio before coding
- [ ] pgvector `vector(1536)` + hnsw index + similarity RPC (verify the index actually builds)
- [ ] embed-ticket edge function (gemini-embedding-001 @ 1536) + wired on write
- [ ] Seed-embedding script: resumable, token-throttled, vectors committed to seed.sql
- [ ] triage / suggest-reply / summarize edge functions
- [ ] AI panels (triage hint, reply draft, summary)
- [ ] Semantic search + similar tickets
- [ ] MSW AI mocks + fallback handling
- [ ] Docs (AI architecture, cost)

## Success criteria

New ticket gets AI category/priority suggestion; agent gets editable AI draft; semantic search returns relevant tickets; demo works on MSW mocks (no key needed).

## Risks

- API keys must stay in edge functions (never client). Verify no leak.
- **Free-tier quotas are per-project and unpublished** — they change without notice and aren't in the docs. The table above is one snapshot; a model that works today can tighten tomorrow. Every AI path needs a real 429/`RESOURCE_EXHAUSTED` fallback, not just a happy path: the UI degrades to keyword search and a disabled Smart-search toggle (Phase 06 guarantees the app is fully usable with no AI at all).
- **Re-running the seed-embedding script burns the daily budget twice** (500 of 1,000 RPD per pass) — resumability isn't polish here, it's what stops a failed run from blocking you until tomorrow.
- Docs and reality can disagree: the pricing page lists 3.5 Flash on the free tier while its actual ceiling is 20 requests/day, and users report immediate quota errors on it. Trust the AI Studio numbers and a real test request over the pricing page.
