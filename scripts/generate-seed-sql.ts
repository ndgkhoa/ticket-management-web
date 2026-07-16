/**
 * Renders the fixture source into `supabase/seed.sql`.
 *
 * The seed is generated, not written, because the same rows also back the MSW
 * handlers. Two hand-maintained copies of "the demo data" drift within a week, and
 * the drift shows up as tests that pass against mocks while the live demo is
 * broken — precisely the failure the phase's parity requirement exists to prevent.
 *
 * The output is committed: `supabase db reset` needs a plain .sql file, and a
 * reviewer cloning the repo should not have to run a script to get a database.
 * `bun run seed:check` re-renders and diffs, so a fixture edit that skips the
 * regeneration fails CI instead of silently shipping a stale seed.
 *
 * Usage: bun run seed:gen
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  cannedResponseRows,
  categoryRows,
  permissionRows,
  rolePermissionRows,
  roleRows,
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

/** Escape a value into a SQL literal. Single quotes double up; nulls stay unquoted. */
function sql(value: SqlValue): string {
  // `undefined` means a column name that does not exist on the row — a typo in the
  // column list, or a fixture that drifted from the schema. Left alone it renders as
  // the *string* 'undefined' and inserts cleanly, so the corruption is only found
  // later, in the data. `null` is a legitimate value and stays distinct from this.
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

/**
 * One multi-row INSERT per table rather than one statement per row: ~3,000 rows as
 * individual statements is ~3,000 round trips of planning overhead, and turns a
 * `db reset` from seconds into a coffee break.
 */
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

/**
 * Wipe before seeding so the script is re-runnable against an already-populated
 * database (a linked hosted project, where \`db reset\` is not an option anyone
 * sane takes).
 *
 * Order matters: \`tickets.requester_id\` is ON DELETE RESTRICT, so profiles cannot
 * go before the tickets referencing them. Truncating public first, then deleting
 * auth.users — which cascades to profiles — is the only order that works.
 */
const TRUNCATE = `truncate table
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

/**
 * Password hashing happens in the database, not here: a bcrypt hash baked into a
 * committed file is a hash someone eventually reuses somewhere that matters.
 * \`gen_salt\` also keeps the file stable — a hash embedded at generation time would
 * change on every run and make the diff meaningless.
 */
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
    // Pre-confirmed: nobody can click a confirmation link in a seeded demo.
    email_confirmed_at: user.created_at,
    raw_app_meta_data: { provider: 'email', providers: ['email'] },
    // The `on_auth_user_created` trigger reads these to build the profile — the same
    // path a real OAuth sign-up takes, so the trigger is exercised by the seed too.
    raw_user_meta_data: { full_name: user.full_name, avatar_url: user.avatar_url },
    created_at: user.created_at,
    updated_at: user.created_at,
    // NOT NULL without defaults in GoTrue's schema. Empty string, not null.
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

/** GoTrue refuses email/password sign-in without a matching identity row. */
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

/**
 * The trigger already created these from the auth metadata; this pins `created_at`
 * and re-asserts the values, so the seed does not depend on trigger internals to be
 * correct.
 */
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
  insertInto('public.categories', ['id', 'name', 'description'], categoryRows),
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
