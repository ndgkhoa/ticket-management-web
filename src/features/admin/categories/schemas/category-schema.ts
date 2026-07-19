import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

/**
 * Category: the `categories` row as a domain model. A ticket category is a name +
 * optional description, plus an optional default team a ticket in it is auto-routed to on
 * create (Phase 02 routing).
 */
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
