import { z } from 'zod';

import { ticketSearchSchema } from '~/features/tickets/schemas/ticket-search-schema';

const savedViewRowSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  name: z.string(),
  search: z.unknown(),
  is_shared: z.boolean(),
  created_at: z.string(),
});

export const savedViewSchema = savedViewRowSchema.transform((row) => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  search: ticketSearchSchema.parse(row.search ?? {}),
  isShared: row.is_shared,
  createdAt: row.created_at,
}));

export type SavedView = z.infer<typeof savedViewSchema>;

export const SAVED_VIEW_COLUMNS = 'id, user_id, name, search, is_shared, created_at';
