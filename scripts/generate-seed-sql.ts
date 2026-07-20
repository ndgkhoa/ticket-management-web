import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  cannedResponseRows,
  categoryRows,
  permissionRows,
  rolePermissionRows,
  roleRows,
  savedViewRows,
  slaPolicyRows,
  tagRows,
  teamMemberRows,
  teamRows,
  ticketEventRows,
  ticketMessageRows,
  ticketRows,
  ticketTagRows,
  userRoleRows,
  userRows,
} from '../src/mocks/fixtures';

type SqlValue = string | number | boolean | null | undefined | Record<string, unknown>;

function sql(value: SqlValue): string {
  if (value === undefined) {
    throw new Error(
      'Refusing to render `undefined` as SQL — a column in the insert list is missing from the row.'
    );
  }

  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return `${sql(JSON.stringify(value))}::jsonb`;

  return `'${value.replace(/'/g, "''")}'`;
}

function insertInto<T extends object>(
  table: string,
  columns: readonly (keyof T & string)[],
  rows: readonly T[],
  { columnExpressions = {} }: { columnExpressions?: Record<string, (row: T) => string> } = {}
): string {
  if (rows.length === 0) return '';

  const values = rows
    .map((row) => {
      const cells = columns.map((column) =>
        columnExpressions[column] ? columnExpressions[column](row) : sql(row[column] as SqlValue)
      );

      return `  (${cells.join(', ')})`;
    })
    .join(',\n');

  return `insert into ${table} (${columns.join(', ')}) values\n${values};\n`;
}

const HEADER = `-- GENERATED FILE — DO NOT EDIT.
--
-- Rendered from src/mocks/fixtures by scripts/generate-seed-sql.ts.
-- Edit the fixtures and run \`bun run seed:gen\`; \`bun run seed:check\` fails CI if
-- this file and the fixtures have drifted apart.
--
-- The same rows feed the MSW handlers, which is what makes MSW and Supabase
-- answer identically for identical params.
`;

const TRUNCATE = `truncate table
  public.saved_views,
  public.ticket_events,
  public.attachments,
  public.ticket_messages,
  public.ticket_tags,
  public.tickets,
  public.canned_responses,
  public.sla_policies,
  public.tags,
  public.categories,
  public.team_members,
  public.teams,
  public.user_roles,
  public.role_permissions,
  public.permissions,
  public.roles
  restart identity cascade;

delete from auth.users;
`;

const authUsers = insertInto(
  'auth.users',
  [
    'instance_id',
    'id',
    'aud',
    'role',
    'email',
    'encrypted_password',
    'email_confirmed_at',
    'raw_app_meta_data',
    'raw_user_meta_data',
    'created_at',
    'updated_at',
    'confirmation_token',
    'email_change',
    'email_change_token_new',
    'recovery_token',
  ] as never[],
  userRows.map((user) => ({
    instance_id: '00000000-0000-0000-0000-000000000000',
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    encrypted_password: user.password,
    email_confirmed_at: user.created_at,
    raw_app_meta_data: { provider: 'email', providers: ['email'] },
    raw_user_meta_data: { full_name: user.full_name, avatar_url: user.avatar_url },
    created_at: user.created_at,
    updated_at: user.created_at,
    confirmation_token: '',
    email_change: '',
    email_change_token_new: '',
    recovery_token: '',
  })),
  {
    columnExpressions: {
      encrypted_password: (user: { encrypted_password: string }) =>
        `extensions.crypt(${sql(user.encrypted_password)}, extensions.gen_salt('bf'))`,
    },
  }
);

const authIdentities = insertInto(
  'auth.identities',
  [
    'id',
    'user_id',
    'provider_id',
    'identity_data',
    'provider',
    'last_sign_in_at',
    'created_at',
    'updated_at',
  ] as never[],
  userRows.map((user) => ({
    id: user.id,
    user_id: user.id,
    provider_id: user.id,
    identity_data: { sub: user.id, email: user.email, email_verified: true },
    provider: 'email',
    last_sign_in_at: user.created_at,
    created_at: user.created_at,
    updated_at: user.created_at,
  }))
);

const profiles = insertInto(
  'public.profiles',
  ['id', 'email', 'full_name', 'avatar_url', 'created_at'] as never[],
  userRows.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  }))
).replace(
  /;\n$/,
  '\non conflict (id) do update set\n  email = excluded.email,\n  full_name = excluded.full_name,\n  avatar_url = excluded.avatar_url,\n  created_at = excluded.created_at;\n'
);

const sections = [
  HEADER,
  TRUNCATE,
  '-- Auth ---------------------------------------------------------------------',
  authUsers,
  authIdentities,
  profiles,
  '-- RBAC ---------------------------------------------------------------------',
  insertInto('public.roles', ['id', 'name', 'description', 'is_system'], roleRows),
  insertInto('public.permissions', ['id', 'code', 'description'], permissionRows),
  insertInto('public.role_permissions', ['role_id', 'permission_id'], rolePermissionRows),
  insertInto('public.user_roles', ['user_id', 'role_id'], userRoleRows),
  '-- Organization -------------------------------------------------------------',
  insertInto('public.teams', ['id', 'name', 'description'], teamRows),
  insertInto('public.team_members', ['team_id', 'user_id'], teamMemberRows),
  insertInto('public.categories', ['id', 'name', 'description', 'default_team_id'], categoryRows),
  insertInto('public.tags', ['id', 'name', 'color'], tagRows),
  insertInto(
    'public.sla_policies',
    ['id', 'name', 'priority', 'first_response_mins', 'resolution_mins'],
    slaPolicyRows
  ),
  insertInto(
    'public.canned_responses',
    ['id', 'title', 'body', 'created_by', 'created_at'],
    cannedResponseRows
  ),
  '-- Tickets ------------------------------------------------------------------',
  'begin;',
  'alter table public.tickets disable trigger tickets_emit_change_events;',
  'alter table public.ticket_messages disable trigger ticket_messages_emit_comment;',
  'alter table public.ticket_tags disable trigger ticket_tags_emit_event;',
  insertInto(
    'public.tickets',
    [
      'id',
      'subject',
      'description',
      'status',
      'priority',
      'channel',
      'requester_id',
      'assignee_id',
      'team_id',
      'category_id',
      'sla_policy_id',
      'first_response_at',
      'resolved_at',
      'due_at',
      'created_at',
      'updated_at',
    ],
    ticketRows
  ),
  insertInto('public.ticket_tags', ['ticket_id', 'tag_id'], ticketTagRows),
  insertInto(
    'public.ticket_messages',
    ['id', 'ticket_id', 'author_id', 'type', 'body', 'created_at'],
    ticketMessageRows
  ),
  insertInto(
    'public.ticket_events',
    ['id', 'ticket_id', 'actor_id', 'event_type', 'meta', 'created_at'],
    ticketEventRows
  ),
  'alter table public.tickets enable trigger tickets_emit_change_events;',
  'alter table public.ticket_messages enable trigger ticket_messages_emit_comment;',
  'alter table public.ticket_tags enable trigger ticket_tags_emit_event;',
  'commit;',
  '-- Saved views --------------------------------------------------------------',
  insertInto(
    'public.saved_views',
    ['id', 'user_id', 'name', 'search', 'is_shared', 'created_at'],
    savedViewRows
  ),
];

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/seed.sql');
writeFileSync(outputPath, `${sections.join('\n')}\n`, 'utf8');

const rowCount =
  userRows.length +
  roleRows.length +
  permissionRows.length +
  rolePermissionRows.length +
  userRoleRows.length +
  teamRows.length +
  teamMemberRows.length +
  categoryRows.length +
  tagRows.length +
  slaPolicyRows.length +
  cannedResponseRows.length +
  ticketRows.length +
  ticketTagRows.length +
  ticketMessageRows.length +
  ticketEventRows.length;

console.log(
  `seed.sql written: ${rowCount} rows (${userRows.length} users, ${ticketRows.length} tickets, ${ticketMessageRows.length} messages, ${ticketEventRows.length} events)`
);
