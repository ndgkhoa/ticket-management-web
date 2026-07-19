import { z } from 'zod';

import { ticketSchema, type Ticket } from '~/features/tickets/schemas/ticket-schema';

/**
 * A semantic-search / similar-tickets hit: a ticket plus its cosine similarity to the
 * query (higher = closer, computed as `1 - distance` in the RPC).
 *
 * The RPC returns the full ticket row with a `similarity` column appended, so this reuses
 * `ticketSchema` for the ticket half (one source of truth for the camelCase mapping) and
 * reads `similarity` alongside it, rather than restating every column.
 */
const similaritySchema = z.object({ similarity: z.number() });

export type TicketMatch = Ticket & { similarity: number };

/** Parse one RPC row into a ticket + similarity. Throws if the row shape is wrong. */
export function parseTicketMatch(row: unknown): TicketMatch {
  const ticket = ticketSchema.parse(row);
  const { similarity } = similaritySchema.parse(row);
  return { ...ticket, similarity };
}

/** Parse the full RPC result set. */
export function parseTicketMatches(rows: unknown): TicketMatch[] {
  return z.array(z.unknown()).parse(rows).map(parseTicketMatch);
}
