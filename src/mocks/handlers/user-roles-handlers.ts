import { http } from 'msw';

import {
  permissionRows,
  roleIdByName,
  rolePermissionRows,
  roleRows,
  userRoleRows,
} from '~/mocks/fixtures';
import { createJunctionStore } from '~/mocks/lib/table-store';
import { parsePostgrestRequest } from '~/mocks/lib/postgrest-request';
import { collectionResponse, objectResponse } from '~/mocks/lib/postgrest-response';

export const userRolesStore = createJunctionStore(userRoleRows);

const permissionCodeById = new Map(permissionRows.map((row) => [row.id, row.code]));

function nestedPermissionRead(userId: string | undefined) {
  const roleIds = userRolesStore
    .all()
    .filter((userRole) => userRole.user_id === userId)
    .map((userRole) => userRole.role_id);
  const effectiveRoleIds = roleIds.length > 0 ? roleIds : [roleIdByName.get('customer')!];

  return effectiveRoleIds.map((roleId) => ({
    roles: {
      id: roleId,
      name: roleRows.find((role) => role.id === roleId)?.name ?? '',
      role_permissions: rolePermissionRows
        .filter((rolePermission) => rolePermission.role_id === roleId)
        .map((rolePermission) => ({
          permissions: { code: permissionCodeById.get(rolePermission.permission_id) ?? '' },
        })),
    },
  }));
}

function eqFilters(request: Request): Record<string, string> {
  const { filters } = parsePostgrestRequest(request);
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, filter]) => filter.op === 'eq')
      .map(([column, filter]) => [column, filter.value])
  );
}

const read = http.get('*/rest/v1/user_roles', ({ request }) => {
  const select = new URL(request.url).searchParams.get('select') ?? '';
  const match = eqFilters(request);

  if (select.includes('roles(')) {
    return collectionResponse(nestedPermissionRead(match.user_id));
  }

  const rows = userRolesStore
    .all()
    .filter((row) =>
      Object.entries(match).every(
        ([col, value]) => String((row as Record<string, string>)[col]) === value
      )
    );
  return collectionResponse(rows);
});

const create = http.post('*/rest/v1/user_roles', async ({ request }) => {
  const single = (request.headers.get('accept') ?? '').includes(
    'application/vnd.pgrst.object+json'
  );
  const body = (await request.json().catch(() => ({}))) as
    { user_id: string; role_id: string } | { user_id: string; role_id: string }[];
  const inserted = (Array.isArray(body) ? body : [body]).map((row) => userRolesStore.insert(row));
  return single ? objectResponse(inserted[0]) : collectionResponse(inserted);
});

const destroy = http.delete('*/rest/v1/user_roles', ({ request }) => {
  const match = eqFilters(request);
  const removed = userRolesStore
    .all()
    .filter((row) =>
      Object.entries(match).every(
        ([col, value]) => String((row as Record<string, string>)[col]) === value
      )
    );
  userRolesStore.removeWhere(match);
  return collectionResponse(removed);
});

export const userRolesHandlers = [read, create, destroy];
