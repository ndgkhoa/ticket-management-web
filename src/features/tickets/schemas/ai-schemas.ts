import { z } from 'zod';

import { ticketPrioritySchema } from '~/features/tickets/schemas/ticket-enums';

/**
 * Zod schemas for the AI edge-function responses.
 *
 * These are validated on the client because an edge function's output is untrusted
 * input: it wraps an LLM, which can return a shape you did not ask for, and a bad deploy
 * or a quota error can return an `{ error }` body instead. Parsing here turns "the model
 * hallucinated a field" into a caught error and a graceful fallback, not a runtime crash
 * deep in a component.
 */

/** `ai-triage` → suggested priority, an optional category label, and a one-line reason. */
export const aiTriageResultSchema = z.object({
  priority: ticketPrioritySchema,
  // A label the model picked from the categories the client offered, or null if none fit.
  category: z.string().nullable().optional(),
  reason: z.string(),
});

export type AiTriageResult = z.infer<typeof aiTriageResultSchema>;

/** `ai-suggest-reply` → a single draft reply (plain text). */
export const aiReplyResultSchema = z.object({
  draft: z.string().min(1),
});

export type AiReplyResult = z.infer<typeof aiReplyResultSchema>;

/** `ai-summarize` → a short thread summary. */
export const aiSummaryResultSchema = z.object({
  summary: z.string().min(1),
});

export type AiSummaryResult = z.infer<typeof aiSummaryResultSchema>;

/** `embed-query` → the query vector the client hands to the `match_tickets` RPC. */
export const aiEmbedQueryResultSchema = z.object({
  embedding: z.array(z.number()),
  dimensions: z.number().int().positive(),
});

export type AiEmbedQueryResult = z.infer<typeof aiEmbedQueryResultSchema>;
