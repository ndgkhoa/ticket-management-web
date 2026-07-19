import { createCrudQueries } from '~/features/admin/shared/use-crud-queries';
import { roleApi, type RoleInput } from '~/features/admin/roles/api/role-api';
import { roleKeys } from '~/features/admin/roles/constants/role-keys';
import type { Role } from '~/features/admin/roles/schemas/role-schema';

const roleQueries = createCrudQueries<Role, RoleInput>({ keys: roleKeys, api: roleApi });

export const roleListQuery = roleQueries.listQuery;
export const useRoleList = roleQueries.useList;
export const useRoleCreate = roleQueries.useCreate;
export const useRoleUpdate = roleQueries.useUpdate;
export const useRoleRemove = roleQueries.useRemove;
