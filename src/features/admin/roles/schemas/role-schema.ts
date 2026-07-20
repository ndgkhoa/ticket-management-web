import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

const roleRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  is_system: z.boolean(),
}) satisfies z.ZodType<Tables<'roles'>>;

export const roleSchema = roleRowSchema.transform((row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isSystem: row.is_system,
}));

export type Role = z.infer<typeof roleSchema>;

export const ROLE_COLUMNS = 'id, name, description, is_system';
