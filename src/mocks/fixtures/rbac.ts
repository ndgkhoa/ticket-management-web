/**
 * The permission catalogue and the role → permission matrix.
 *
 * Every code here is checked by a policy in
 * `supabase/migrations/*_row_level_security.sql`. That is a rule, not a
 * coincidence: a permission nothing enforces is worse than no permission, because
 * it shows up in the admin UI and reads as protection that does not exist.
 *
 * Notably absent: `ticket.assign`. RLS is row-level, so no policy can permit an
 * edit to `status` while refusing one to `assignee_id` — assignment is gated by
 * `ticket.update` instead. If those two ever need to split (an agent may take a
 * ticket, only a lead may hand it to someone else), that is a BEFORE UPDATE
 * trigger comparing `old.assignee_id`, not a policy.
 */

import { fixtureUuid } from './fixture-uuid';
import type { PermissionRow, RolePermissionRow, RoleRow } from './row-types';

const PERMISSION_DEFINITIONS = [
  ['user.read.all', 'Read every profile, not just those on visible tickets'],
  ['user.manage', 'Create, edit and delete users; grant and revoke their roles'],
  ['role.manage', 'Create and edit roles and their permission sets'],
  ['permission.manage', 'Edit the permission catalogue itself'],
  ['team.manage', 'Create and edit teams and their membership'],
  ['category.manage', 'Create and edit ticket categories'],
  ['tag.manage', 'Create and edit tags'],
  ['sla.manage', 'Create and edit SLA policies'],
  ['canned.read', 'Use the canned response library'],
  ['canned.manage', 'Create and edit canned responses'],
  ['ticket.read.all', 'Read every ticket in the help desk'],
  ['ticket.read.team', 'Read tickets assigned to you or to your team'],
  ['ticket.create', 'Open a ticket'],
  ['ticket.update', 'Edit a ticket: status, priority, assignment, category, tags'],
  ['ticket.delete', 'Delete a ticket and its attachments'],
  ['message.read.internal', 'Read internal notes'],
  ['message.create.internal', 'Write internal notes'],
] as const satisfies readonly (readonly [string, string])[];

export type PermissionCode = (typeof PERMISSION_DEFINITIONS)[number][0];

export const permissionRows: PermissionRow[] = PERMISSION_DEFINITIONS.map(
  ([code, description], index) => ({
    id: fixtureUuid('permission', index + 1),
    code,
    description,
  })
);

const permissionIdByCode = new Map(permissionRows.map((row) => [row.code, row.id]));

const ROLE_DEFINITIONS = [
  {
    name: 'owner',
    description: 'Full control, including the permission catalogue itself',
    // Every permission — spread rather than listed, so a new permission is
    // owner-granted by construction and cannot be forgotten here.
    permissions: PERMISSION_DEFINITIONS.map(([code]) => code),
  },
  {
    name: 'admin',
    description: 'Runs the help desk: users, org data and every ticket',
    // Everything except `permission.manage`. The catalogue is a mirror of what the
    // RLS policies check — editing it from the UI cannot grant real access, it can
    // only desync the two. That belongs to whoever ships migrations, i.e. owner.
    permissions: PERMISSION_DEFINITIONS.map(([code]) => code).filter(
      (code) => code !== 'permission.manage'
    ),
  },
  {
    name: 'agent',
    description: 'Works tickets for their team, sees internal notes',
    permissions: [
      // Deliberately NOT `user.read.all`. An agent needs two things: the staff
      // roster for the assignee picker, and the requesters on their own tickets.
      // The profiles policy gives both — staff via team membership, requesters via
      // ticket visibility. `user.read.all` would hand over the entire customer
      // list to solve the roster problem, which is the shape of over-permissioning
      // that turns one compromised agent account into a customer database leak.
      'canned.read',
      'ticket.read.team',
      'ticket.create',
      'ticket.update',
      'message.read.internal',
      'message.create.internal',
    ],
  },
  {
    name: 'customer',
    description: 'Opens tickets and replies to their own',
    // Only this. Reading their own tickets needs no permission — the tickets policy
    // grants it on `requester_id = auth.uid()`, and replying is an insert into
    // ticket_messages gated on ticket visibility. Internal notes are invisible
    // precisely because `message.read.internal` is missing here.
    permissions: ['ticket.create'],
  },
] as const satisfies readonly {
  name: string;
  description: string;
  permissions: readonly PermissionCode[];
}[];

export type RoleName = (typeof ROLE_DEFINITIONS)[number]['name'];

export const roleRows: RoleRow[] = ROLE_DEFINITIONS.map((role, index) => ({
  id: fixtureUuid('role', index + 1),
  name: role.name,
  description: role.description,
  // Seeded roles are load-bearing for RLS; the admin UI must refuse to delete them.
  is_system: true,
}));

export const roleIdByName = new Map(roleRows.map((row) => [row.name as RoleName, row.id]));

export const rolePermissionRows: RolePermissionRow[] = ROLE_DEFINITIONS.flatMap((role) =>
  role.permissions.map((code) => ({
    role_id: roleIdByName.get(role.name)!,
    permission_id: permissionIdByCode.get(code)!,
  }))
);
