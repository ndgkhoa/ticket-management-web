import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

const userRowSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<'profiles'>>;

export const userSchema = userRowSchema.transform((row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
}));

export type User = z.infer<typeof userSchema>;

export const USER_COLUMNS = 'id, email, full_name, avatar_url, created_at';
