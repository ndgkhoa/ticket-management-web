import { z } from 'zod';

import type { Tables } from '~/lib/database.types';
import {
  ticketChannelSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from '~/features/tickets/schemas/ticket-enums';

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

export type Ticket = z.infer<typeof ticketSchema>;

export const TICKET_COLUMNS =
  'id, subject, description, status, priority, channel, requester_id, assignee_id, team_id, category_id, sla_policy_id, first_response_at, resolved_at, due_at, sla_paused_at, sla_paused_ms, created_at, updated_at';
