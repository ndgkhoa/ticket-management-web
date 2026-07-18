import { z } from 'zod';

/**
 * An assignable agent, as the ticket list's assignee filter needs it — id for the
 * filter value, name + avatar for the option label. A thin projection of `profiles`,
 * not the full admin `User`: the filter never edits a profile, so coupling tickets to
 * the admin user model would carry fields (email, createdAt) it has no use for.
 *
 * The `assignable_agents()` RPC returns whole profile rows; unlisted keys are stripped
 * here by Zod, so the extra columns never reach the component.
 */
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
