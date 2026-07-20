import { uuid } from './uuid';
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
    id: uuid('permission', index + 1),
    code,
    description,
  })
);

const permissionIdByCode = new Map(permissionRows.map((row) => [row.code, row.id]));

const ROLE_DEFINITIONS = [
  {
    name: 'owner',
    description: 'Full control, including the permission catalogue itself',
    permissions: PERMISSION_DEFINITIONS.map(([code]) => code),
  },
  {
    name: 'admin',
    description: 'Runs the help desk: users, org data and every ticket',
    permissions: PERMISSION_DEFINITIONS.map(([code]) => code).filter(
      (code) => code !== 'permission.manage'
    ),
  },
  {
    name: 'agent',
    description: 'Works tickets for their team, sees internal notes',
    permissions: [
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
    permissions: ['ticket.create'],
  },
] as const satisfies readonly {
  name: string;
  description: string;
  permissions: readonly PermissionCode[];
}[];

export type RoleName = (typeof ROLE_DEFINITIONS)[number]['name'];

export const roleRows: RoleRow[] = ROLE_DEFINITIONS.map((role, index) => ({
  id: uuid('role', index + 1),
  name: role.name,
  description: role.description,
  is_system: true,
}));

export const roleIdByName = new Map(roleRows.map((row) => [row.name as RoleName, row.id]));

export const rolePermissionRows: RolePermissionRow[] = ROLE_DEFINITIONS.flatMap((role) =>
  role.permissions.map((code) => ({
    role_id: roleIdByName.get(role.name)!,
    permission_id: permissionIdByCode.get(code)!,
  }))
);
