import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

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

export const PERMISSION_COLUMNS = 'id, code, description';
