import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

/**
 * Role: the `roles` row as a domain model.
 *
 * `isSystem` marks the seeded roles the RLS model depends on (owner/admin/agent/
 * customer). The rebuilt admin UI uses it to refuse deletion of those rows; it is
 * carried here so that guard has something to read.
 *
 * Input schema is deferred to the admin UI rebuild, along with the role-permission
 * assignment editing that needs the `role_permissions` junction.
 */
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
