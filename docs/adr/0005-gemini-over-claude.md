# ADR-0005: Gemini Over Claude for AI Features

**Date:** 2026-07-15 | **Status:** Accepted | **Priority:** P1

## Context

Chose the AI model for triage, reply suggestion, summary, and semantic search. Two leading options:

- **Claude 3.5 Sonnet** (Anthropic): Best-in-class reasoning, great API docs, but no embeddings
- **Gemini 3.1 Flash Lite** (Google): Strong reasoning, includes embeddings, free tier generous

The app needs **both** chat (triage/reply/summary) and embeddings (semantic search). This is the key constraint.

## Decision

Use **Gemini 3.1 Flash Lite** (chat) + **gemini-embedding-001** (embeddings) for all AI features.

## Why Gemini, Not Claude

### Embeddings: Show-Stopper

**Claude:**

- Anthropic ships **no embeddings API**
- Their docs say: "For embeddings, use Voyage AI" (third-party)
- Voyage free tier is more restrictive than Gemini free
- To use Claude for chat + Voyage for embeddings = 2 vendors + complexity

**Gemini:**

- Includes `gemini-embedding-001` (1536 dimensions, Matryoshka — can reduce dimensionality)
- Same free-tier key as chat models
- Both chat + embeddings on one API, one project

**Result:** A Claude-only stack **cannot power semantic search** without adding another vendor. Gemini is simpler.

### Free Tier Quotas

| Model             | Purpose             | Free Tier        | Notes                                          |
| ----------------- | ------------------- | ---------------- | ---------------------------------------------- |
| Claude 3.5 Sonnet | Chat (triage/reply) | 50K tokens/month | Pay-as-you-go ($0.003/1K input)                |
| Gemini Flash Lite | Chat (triage/reply) | 500 RPD, 30K TPM | 500 requests/day is enough for recruiter demos |
| Voyage AI         | Embeddings          | Unclear (undocs) | Third-party, added complexity                  |
| Gemini embeddings | Embeddings          | ~1K RPD, 30K TPM | Same key as chat                               |

For a **demo project with seeded tickets** (no real users), Gemini free tier is sufficient:

- CI makes zero AI calls (MSW mocks everything)
- Recruiter tries triage + reply suggestion = ~5 calls
- Embeddings run once per 500 tickets (seed time, cached)
- Total: <50 API calls/week

Gemini free tier is never reached. Claude's 50K tokens/month + Voyage's unknown limits aren't triggers, but Gemini's simplicity wins.

## Caveat: Data Privacy

**Gemini free tier uses submitted content to improve Google's products.** This is documented in their terms.

**Acceptable here because:**

- All data is seeded, fabricated demo tickets (no real user data)
- If/when real user data exists → must move to Gemini paid tier or another provider
- Code is architected for this (all AI calls go through Edge Functions; switching keys is one env var)

**Not acceptable for:** Production help desks serving real customers. The day you onboard real users, migrate to Gemini paid or replace with a provider that doesn't train on your data.

For now, it's a reasonable trade-off on a portfolio project.

## Implementation

```typescript
// supabase/functions/ai-triage/index.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
const model = client.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

const result = await model.generateContent(prompt);
```

Semantic search:

```typescript
// supabase/functions/embed-query/index.ts
const model = client.getGenerativeModel({ model: 'embedding-001' });

const embeddingResult = await model.embedContent(queryText);
const queryEmbedding = embeddingResult.embedding.values;
```

Then use the vector to search via Postgres RPC:

```sql
SELECT * FROM match_tickets(query_embedding, match_count => 5)
```

## Alternatives Rejected

### Claude + Voyage (Two Vendors)

```
Claude Sonnet (triage/reply)  ──────────┐
                                       Requires two API keys
Voyage AI (embeddings) ────────────────┘
```

Downsides:

- Two separate free tiers to track (limits + quotas)
- Two vendors = two places auth can fail
- More ENV vars to manage
- Voyage's free tier is less documented
- Adds ~50 KB to bundle (two client libraries)

Trade-off not justified for a demo.

### Claude API Only (No Embeddings)

Skip semantic search entirely → simpler, but loses a feature:

- Keyword search (Postgres FTS) is fine but less powerful
- Semantic search (embeddings) shows LLM + vector DB integration
- Recruiters expect modern search; keyword-only is a step back

### Open-Source Embeddings (Ollama, HuggingFace)

Self-hosted or API:

- Requires separate infrastructure (Ollama server or HF API)
- Adds deployment complexity
- Slower than Gemini (HF free tier has rate limits)
- Still need a chat model (Claude or Gemini)

Not justified for a portfolio project.

## Cost Breakdown (Gemini Free vs Paid)

| Feature           | Free Tier Limit   | This App Usage | Notes                         |
| ----------------- | ----------------- | -------------- | ----------------------------- |
| Chat (500 RPD)    | 500 requests/day  | ~20/week       | CI is zero, recruiter is 5-10 |
| Embeddings (1K+)  | ~1K requests/day  | ~1/seed cycle  | 500 tickets embedded once     |
| **Total monthly** | **~15K requests** | **~100**       | Free tier never hit           |

Paid tier (if needed):

- Chat: $0.075 per 1M input tokens (~100 recruiter calls = $0.01)
- Embeddings: $0.02 per 1M embedding tokens (~500 tickets = $0.01)
- Negligible cost if real users ever use it

## Migration Path (Future)

If real user data arrives:

```bash
# Option A: Stay with Google (paid tier)
GEMINI_API_KEY=AIzaSy...  # Same code, just a paid key

# Option B: Switch to Claude (requires code changes)
# Replace embeddings: use Voyage AI for vectors
# Replace chat: use Claude API for triage/reply

# Option C: Switch to open-source (self-hosted)
# Replace all Gemini calls with local LLM
```

The current architecture (all AI behind Edge Functions) makes switching tractable.

## Related Decisions

- **ADR-0004** (Edge Functions): AI calls proxied server-side, secrets never exposed
- Every AI call has a MSW mock for tests + static demo

## Rationale Summary

| Criterion            | Gemini                            | Claude                         |
| -------------------- | --------------------------------- | ------------------------------ |
| **Chat model**       | Excellent (Flash Lite 500 RPD)    | Excellent (Sonnet)             |
| **Embeddings**       | ✅ Included (embedding-001)       | ❌ External (Voyage AI)        |
| **Free tier**        | Generous (both chat + embeddings) | Limited (50K tokens/month)     |
| **Vendor count**     | 1                                 | 2 (Anthropic + Voyage)         |
| **Complexity**       | 1 key, 1 endpoint                 | 2 keys, 2 endpoints            |
| **Data privacy**     | Free tier trains on data          | No training clause (paid-only) |
| **For this project** | ✅ Best fit                       | ❌ More complex                |

The decision is clear for a demo. Revisit if requirements change.
