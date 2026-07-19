import { z } from 'zod';

import type { Tables } from '~/lib/database.types';
import {
  ticketChannelSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from '~/features/tickets/schemas/ticket-enums';

/**
 * Ticket: the raw `tickets` row mapped to a camelCase domain model.
 *
 * This is the boundary the whole naming convention rests on — snake_case dies here,
 * once, at the api layer, and no camelCase field named `Id` or `created_at` reaches a
 * component. The mapping is explicit rather than an automatic key-caser: a generic
 * snake→camel pass loses type safety and would happily carry through the internal
 * `search_vector`/`embedding` columns the UI must never see.
 *
 * `search_vector` (FTS index feed) and `embedding` (AI, Phase 07) are dropped on
 * purpose: they are storage, not domain.
 */

/**
 * Input schema — the shape as Postgres returns it. Typed against `Tables<'tickets'>`
 * so a column renamed or retyped in a migration (and regenerated into
 * `database.types.ts`) breaks this at compile time instead of at runtime in a seed or
 * a live fetch.
 */
const ticketRowSchema = z.object({
  id: z.uuid(),
  subject: z.string(),
  description: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  channel: ticketChannelSchema,
  requester_id: z.uuid(),
  assignee_id: z.uuid().nullable(),
  team_id: z.uuid().nullable(),
  category_id: z.uuid().nullable(),
  sla_policy_id: z.uuid().nullable(),
  first_response_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
  due_at: z.string().nullable(),
  sla_paused_at: z.string().nullable(),
  sla_paused_ms: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
}) satisfies z.ZodType<Omit<Tables<'tickets'>, 'search_vector' | 'embedding'>>;

export const ticketSchema = ticketRowSchema.transform((row) => ({
  id: row.id,
  subject: row.subject,
  description: row.description,
  status: row.status,
  priority: row.priority,
  channel: row.channel,
  requesterId: row.requester_id,
  assigneeId: row.assignee_id,
  teamId: row.team_id,
  categoryId: row.category_id,
  slaPolicyId: row.sla_policy_id,
  firstResponseAt: row.first_response_at,
  resolvedAt: row.resolved_at,
  dueAt: row.due_at,
  slaPausedAt: row.sla_paused_at,
  slaPausedMs: row.sla_paused_ms,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}));

/** The domain model. `z.infer` of the schema — the schema is the single source. */
export type Ticket = z.infer<typeof ticketSchema>;

/**
 * The columns to `.select()` for a ticket. Explicit, not `*`: `*` drags the tsvector
 * and the 1536-float embedding across the wire on every list request, and neither is
 * ever read by the client.
 */
export const TICKET_COLUMNS =
  'id, subject, description, status, priority, channel, requester_id, assignee_id, team_id, category_id, sla_policy_id, first_response_at, resolved_at, due_at, sla_paused_at, sla_paused_ms, created_at, updated_at';
