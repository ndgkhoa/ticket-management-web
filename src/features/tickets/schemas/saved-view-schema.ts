import { z } from 'zod';

import { ticketSearchSchema } from '~/features/tickets/schemas/ticket-search-schema';

/**
 * SavedView: a `saved_views` row as a domain model. The `search` column is jsonb — the
 * whole TicketSearch object — so it's re-validated through `ticketSearchSchema` on the way
 * out, which means a view saved under an older param shape (or a tampered row) falls back to
 * the search defaults instead of feeding garbage into the URL.
 */
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

/** Columns to select — explicit, matching the domain fields. */
export const SAVED_VIEW_COLUMNS = 'id, user_id, name, search, is_shared, created_at';
