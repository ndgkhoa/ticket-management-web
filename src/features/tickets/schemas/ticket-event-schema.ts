import { z } from 'zod';

import { ticketEventTypeSchema } from '~/features/tickets/schemas/ticket-enums';

const ticketEventRowSchema = z.object({
  id: z.uuid(),
  ticket_id: z.uuid(),
  actor_id: z.uuid().nullable(),
  event_type: ticketEventTypeSchema,
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

export const ticketEventSchema = ticketEventRowSchema.transform((row) => ({
  id: row.id,
  ticketId: row.ticket_id,
  actorId: row.actor_id,
  eventType: row.event_type,
  meta: row.meta,
  createdAt: row.created_at,
}));

export type TicketEvent = z.infer<typeof ticketEventSchema>;

export const TICKET_EVENT_COLUMNS = 'id, ticket_id, actor_id, event_type, meta, created_at';
