import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

/**
 * Team: the `teams` row as a domain model. A support team is just a name + optional
 * description — the group tickets get assigned to.
 */
const teamRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
}) satisfies z.ZodType<Tables<'teams'>>;

export const teamSchema = teamRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
}));

export type Team = z.infer<typeof teamSchema>;

export const TEAM_COLUMNS = 'id, name, description';
