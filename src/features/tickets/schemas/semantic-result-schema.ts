import { z } from 'zod';

import { ticketSchema, type Ticket } from '~/features/tickets/schemas/ticket-schema';

const similaritySchema = z.object({ similarity: z.number() });

export type TicketMatch = Ticket & { similarity: number };

export function parseTicketMatch(row: unknown): TicketMatch {
  const ticket = ticketSchema.parse(row);
  const { similarity } = similaritySchema.parse(row);
  return { ...ticket, similarity };
}

export function parseTicketMatches(rows: unknown): TicketMatch[] {
  return z.array(z.unknown()).parse(rows).map(parseTicketMatch);
}
