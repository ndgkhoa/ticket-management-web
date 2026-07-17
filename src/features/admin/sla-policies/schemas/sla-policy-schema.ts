import { z } from 'zod';

import type { Tables } from '~/lib/database.types';
import { ticketPrioritySchema } from '~/features/tickets/schemas/ticket-enums';

/**
 * SlaPolicy: the `sla_policies` row as a domain model. One policy per priority level,
 * expressing the first-response and resolution targets in minutes.
 */
const slaPolicyRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  priority: ticketPrioritySchema,
  first_response_mins: z.number(),
  resolution_mins: z.number(),
}) satisfies z.ZodType<Tables<'sla_policies'>>;

export const slaPolicySchema = slaPolicyRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  priority: row.priority,
  first_response_mins: row.first_response_mins,
  resolution_mins: row.resolution_mins,
}));

export type SlaPolicy = z.infer<typeof slaPolicySchema>;

export const SLA_POLICY_COLUMNS = 'id, name, priority, first_response_mins, resolution_mins';
