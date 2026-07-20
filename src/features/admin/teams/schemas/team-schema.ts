import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

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
