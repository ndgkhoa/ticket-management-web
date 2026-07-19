# ADR-0004: AI via Supabase Edge Functions (Server-Side Keys)

**Date:** 2026-07-15 | **Status:** Accepted | **Priority:** P1

## Context

AI features require calling Gemini API for:

- Triage (subject + description → priority + category)
- Reply suggestion (thread + canned responses → draft reply)
- Summary (thread → one-liner)
- Embeddings (`gemini-embedding-001` for semantic search)

Problem: Gemini API key must never be in the browser bundle. Shipping it client-side is a security liability + invites quota exhaustion attacks (any user can call the API directly).

Solution options:

1. **BFF (Backend for Frontend):** Build a Node.js Express server to proxy AI calls
2. **Serverless functions:** AWS Lambda, Vercel Functions, Cloudflare Workers, or Supabase Edge Functions
3. **Third-party service:** Outsource to an AI service layer (Replicate, etc.)

## Decision

Use **Supabase Edge Functions** (Deno-based, runs on Supabase infrastructure) to hold the Gemini key server-side and proxy calls from the client.

## Consequences

**Positive:**

- **Secrets stay server-side.** `GEMINI_API_KEY` never leaves the Edge Function environment. Bundle analysis confirms no secrets leak.
- **No infrastructure.** Supabase Edge Functions are included in the Supabase project; no additional VM/container/Lambda to manage.
- **Zero cold start for the demo.** Supabase Edge Functions are warm and fast (sub-100ms overhead vs Lambda's startup time).
- **Embedded in Supabase.** Easier to reason about (one vendor, one dashboard) than BFF + Supabase separate.
- **RLS-aware RPCs.** Semantic search (vector similarity) runs as a Postgres RPC with the caller's RLS policies applied — prevents users from searching tickets they can't read.
- **Free tier includes Edge Functions.** 500k invocations/month (free tier) is plenty for a demo.

**Negative:**

- **Deno runtime (not Node.js).** Not all npm packages work out-of-the-box; some shims needed. But Gemini SDK is Deno-compatible.
- **Latency:** +100–200ms for Edge Function cold start vs inline client call. Acceptable trade-off for security.
- **Monitoring complexity.** Logs are in Supabase dashboard, not your app's observability stack (unless you export them).
- **Vendor lock-in (Supabase).** Harder to migrate Edge Functions to AWS Lambda later (Deno vs Node.js). But single-tenant + free tier makes migration low-priority.

## Architecture

```
Browser
  ↓ (HTTP POST /functions/v1/ai-triage)
  ↓
Supabase Edge Function (Deno)
  ├─ Verify JWT (already authed via supabase client)
  ├─ Rate-limit check (per-user: 10/min)
  └─ Call Gemini API (GEMINI_API_KEY server-side)
  ↓
Gemini REST API (gcloud.google.com)
  ↓
Response (JSON-constrained)
  ↓
Browser (UI toast on success/error)
```

## Implementation

### Edge Function (Deno)

File: `supabase/functions/ai-triage/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const client = new GoogleGenerativeAI(GEMINI_API_KEY);

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Verify JWT (Supabase middleware)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const { subject, description, categories } = body;

  // Rate-limit (optional, per user_id from JWT claims)
  // ...

  const prompt = `Triage this ticket:
Subject: ${subject}
Description: ${description}

Return JSON: { "priority": "low|normal|high|critical", "category": one of [${categories.join(',')}] }`;

  const model = client.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const json = JSON.parse(text);

  return new Response(JSON.stringify({ data: json }), { status: 200 });
});
```

Deploy:

```bash
supabase functions deploy ai-triage
supabase secrets set GEMINI_API_KEY=AIzaSy...
```

### Client Call

```typescript
// src/features/tickets/api/ai.ts
export async function aiTriage(subject: string, description: string, categories: string[]) {
  const { data, error } = await supabaseClient.functions.invoke('ai-triage', {
    body: { subject, description, categories },
  });

  if (error) throw error;
  return data;
}
```

### MSW Mock (same as Supabase)

```typescript
// src/mocks/handlers/ai.ts
http.post('/functions/v1/ai-triage', async ({ request }) => {
  const body = await request.json();

  // Deterministic mock: always return "high, billing"
  const mock = {
    priority: 'high',
    category: body.categories[0], // Pick first category
  };

  return HttpResponse.json({ data: mock });
});
```

Browser calls the same function; MSW intercepts in tests + static demo.

## Alternatives Rejected

### Client-side Gemini (browser key)

- Exposes API key in `window.GEMINI_KEY` (easily retrieved)
- Anyone can exhaust free-tier quota
- Unacceptable for a public demo (even with fake data)

### BFF (Node.js Express backend)

- Requires hosting (Vercel, Fly.io, Railway)
- Added complexity: auth token flow, CORS, scaling
- Supabase Edge Functions do the same job with zero infrastructure

### AWS Lambda / Vercel Functions

- Edge Functions are simpler (already in Supabase)
- Lambda cold-start (~1–2s) vs Supabase (~100ms)
- Vercel Functions require authentication setup (Vercel specific)

## Monitoring

Log all AI calls (optional, for cost tracking):

```typescript
// In the Edge Function
await supabaseClient.from('ai_call_logs').insert({
  user_id: getUserIdFromJwt(authHeader),
  function: 'ai-triage',
  input_tokens: result.usageMetadata.promptTokenCount,
  output_tokens: result.usageMetadata.candidatesTokenCount,
  created_at: new Date(),
});
```

Admin can query `ai_call_logs` to see usage + cost.

## Rate Limiting (Future)

Add per-user rate limiting in the Edge Function:

```typescript
const key = `ai-triage:${userId}`;
const count = await redis.incr(key);
if (count > 10) {
  return new Response('Rate limited', { status: 429 });
}
await redis.expire(key, 60); // Reset every minute
```

Free tier Gemini is quota-gated anyway (500 RPD), so elaborate rate limiting isn't critical.

## Related Decisions

- **ADR-0005** (Gemini vs Claude): Why Gemini (free embeddings API)
- Every Edge Function has a MSW mirror in `src/mocks/handlers/ai.ts`

## Trade-off

Accepting Supabase vendor lock-in for the convenience of integrated serverless + database + auth. A custom BFF would be more portable but adds deployment/scaling responsibility.
