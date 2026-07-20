import { z } from 'zod';

const assigneeRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

export const assigneeSchema = assigneeRowSchema.transform((row) => ({
  id: row.id,
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
}));

export type Assignee = z.infer<typeof assigneeSchema>;
