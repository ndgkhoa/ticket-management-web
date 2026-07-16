import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

/**
 * Permission: the `permissions` row as a domain model.
 *
 * The old .NET shape (`PermissionCode`, `PermissionName`, audit columns) is gone —
 * the Supabase table is `id · code · description`, so there is no separate display
 * name and no created date. Components that rendered those are rebuilt in the design
 * phase against this shape.
 *
 * Input schema is intentionally absent here: this stage ships a read-only view, and
 * the create/edit forms land with the admin UI rebuild that needs them.
 */
const permissionRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  description: z.string().nullable(),
}) satisfies z.ZodType<Tables<'permissions'>>;

export const permissionSchema = permissionRowSchema.transform((row) => ({
  id: row.id,
  code: row.code,
  description: row.description,
}));

export type Permission = z.infer<typeof permissionSchema>;

/** Columns to select — explicit so the shape stays in lockstep with the schema. */
export const PERMISSION_COLUMNS = 'id, code, description';
