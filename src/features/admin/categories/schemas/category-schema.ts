import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

/**
 * Category: the `categories` row as a domain model. A ticket category is just a
 * name + optional description — the vocabulary the ticket form and filters draw from.
 */
const categoryRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
}) satisfies z.ZodType<Tables<'categories'>>;

export const categorySchema = categoryRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
}));

export type Category = z.infer<typeof categorySchema>;

export const CATEGORY_COLUMNS = 'id, name, description';
