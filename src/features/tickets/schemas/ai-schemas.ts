import { z } from 'zod';

import { ticketPrioritySchema } from '~/features/tickets/schemas/ticket-enums';

export const aiTriageResultSchema = z.object({
  priority: ticketPrioritySchema,
  category: z.string().nullable().optional(),
  reason: z.string(),
});

export type AiTriageResult = z.infer<typeof aiTriageResultSchema>;

export const aiReplyResultSchema = z.object({
  draft: z.string().min(1),
});

export type AiReplyResult = z.infer<typeof aiReplyResultSchema>;

export const aiSummaryResultSchema = z.object({
  summary: z.string().min(1),
});

export type AiSummaryResult = z.infer<typeof aiSummaryResultSchema>;

export const aiEmbedQueryResultSchema = z.object({
  embedding: z.array(z.number()),
  dimensions: z.number().int().positive(),
});

export type AiEmbedQueryResult = z.infer<typeof aiEmbedQueryResultSchema>;
