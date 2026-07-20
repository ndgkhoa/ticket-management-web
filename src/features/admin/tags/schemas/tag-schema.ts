import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

const tagRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string(),
}) satisfies z.ZodType<Tables<'tags'>>;

export const tagSchema = tagRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  color: row.color,
}));

export type Tag = z.infer<typeof tagSchema>;

export const TAG_COLUMNS = 'id, name, color';
