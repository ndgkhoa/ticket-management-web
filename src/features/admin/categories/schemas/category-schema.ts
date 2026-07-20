import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

const categoryRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  default_team_id: z.uuid().nullable(),
}) satisfies z.ZodType<Tables<'categories'>>;

export const categorySchema = categoryRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  defaultTeamId: row.default_team_id,
}));

export type Category = z.infer<typeof categorySchema>;

export const CATEGORY_COLUMNS = 'id, name, description, default_team_id';
