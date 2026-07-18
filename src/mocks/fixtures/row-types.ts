/**
 * Row shapes for the fixture data.
 *
 * Fixtures are **rows**, not domain models — snake_case, exactly as Postgres
 * stores them. That is the whole point: the same fixture feeds `supabase/seed.sql`
 * and the MSW handlers, and MSW then runs it through the *same* row→domain Zod
 * transform the Supabase client uses. A parity bug therefore cannot hide in a
 * hand-written mock shape, because there is no hand-written mock shape.
 *
 * These interfaces are a placeholder for `Database['public']['Tables'][T]['Insert']`
 * from the generated `src/lib/database.types.ts`, which does not exist until the
 * schema has been applied once. They get replaced by the generated types, at which
 * point a schema change that these fixtures don't match becomes a typecheck
 * failure instead of a runtime surprise in a seed run.
 */

export type TicketStatus = 'open' | 'pending' | 'on_hold' | 'solved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketChannel = 'web' | 'email' | 'chat';
export type MessageType = 'public_reply' | 'internal_note';
export type TicketEventType =
  'created' | 'assigned' | 'status_changed' | 'priority_changed' | 'commented' | 'tagged';

/** An auth.users row plus its profile — seeded together, since the trigger links them. */
export type UserRow = {
  id: string;
  email: string;
  /** Plain text here; the seed hashes it with bcrypt on the way into auth.users. */
  password: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
};

export type PermissionRow = {
  id: string;
  code: string;
  description: string;
};

export type RolePermissionRow = { role_id: string; permission_id: string };
export type UserRoleRow = { user_id: string; role_id: string };

export type TeamRow = { id: string; name: string; description: string };
export type TeamMemberRow = { team_id: string; user_id: string };
export type CategoryRow = { id: string; name: string; description: string };
export type TagRow = { id: string; name: string; color: string };

export type SlaPolicyRow = {
  id: string;
  name: string;
  priority: TicketPriority;
  first_response_mins: number;
  resolution_mins: number;
};

export type CannedResponseRow = {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

export type TicketRow = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  requester_id: string;
  assignee_id: string | null;
  team_id: string | null;
  category_id: string | null;
  sla_policy_id: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketTagRow = { ticket_id: string; tag_id: string };

export type TicketMessageRow = {
  id: string;
  ticket_id: string;
  author_id: string;
  type: MessageType;
  body: string;
  created_at: string;
};

export type TicketEventRow = {
  id: string;
  ticket_id: string;
  actor_id: string;
  event_type: TicketEventType;
  meta: Record<string, unknown>;
  created_at: string;
};

export type SavedViewRow = {
  id: string;
  user_id: string;
  name: string;
  /** The TicketSearch object, stored as jsonb. */
  search: Record<string, unknown>;
  is_shared: boolean;
  created_at: string;
};

export type AttachmentRow = {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_url: string;
  file_name: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
};
