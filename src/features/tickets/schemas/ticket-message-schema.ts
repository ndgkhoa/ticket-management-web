import { z } from 'zod';

import type { Tables } from '~/lib/database.types';
import { messageTypeSchema } from '~/features/tickets/schemas/ticket-enums';

/**
 * TicketMessage: a `ticket_messages` row as a domain model — one entry in the ticket's
 * conversation. `type` separates a customer-visible `public_reply` from an agent-only
 * `internal_note` (RLS hides notes from customers; the UI styles them apart).
 */
const ticketMessageRowSchema = z.object({
  id: z.uuid(),
  ticket_id: z.uuid(),
  author_id: z.uuid().nullable(),
  type: messageTypeSchema,
  body: z.string(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<'ticket_messages'>>;

export const ticketMessageSchema = ticketMessageRowSchema.transform((row) => ({
  id: row.id,
  ticketId: row.ticket_id,
  authorId: row.author_id,
  type: row.type,
  body: row.body,
  createdAt: row.created_at,
}));

export type TicketMessage = z.infer<typeof ticketMessageSchema>;

export const TICKET_MESSAGE_COLUMNS = 'id, ticket_id, author_id, type, body, created_at';
