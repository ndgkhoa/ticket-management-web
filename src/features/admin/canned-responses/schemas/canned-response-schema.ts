import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

const cannedResponseRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  body: z.string(),
  created_by: z.uuid().nullable(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<'canned_responses'>>;

export const cannedResponseSchema = cannedResponseRowSchema.transform((row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdBy: row.created_by,
  createdAt: row.created_at,
}));

export type CannedResponse = z.infer<typeof cannedResponseSchema>;

export const CANNED_RESPONSE_COLUMNS = 'id, title, body, created_by, created_at';
