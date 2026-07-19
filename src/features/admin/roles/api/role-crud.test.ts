import { describe, expect, it } from 'vitest';

import { roleApi } from '~/features/admin/roles/api/role-api';
import { rolePermissionApi } from '~/features/admin/roles/api/role-permission-api';
import { permissionRows, roleIdByName } from '~/mocks/fixtures';

/**
 * Role CRUD + the permission matrix over the mock backend. The matrix writes the
 * composite-key `role_permissions` junction, which needs its own MSW handler (rows have
 * no id). Stores re-seed between tests, so writes here don't leak.
 */
describe('role CRUD over MSW', () => {
  it('creates a role that is never a system role', async () => {
    const created = await roleApi.create({ name: 'Auditor', description: 'Read-only access' });

    expect(created.isSystem).toBe(false);
    expect((await roleApi.list()).some((role) => role.id === created.id)).toBe(true);
  });

  it('updates then deletes a role', async () => {
    const created = await roleApi.create({ name: 'Temp', description: null });

    const updated = await roleApi.update(created.id, { name: 'Temp renamed', description: null });
    expect(updated.name).toBe('Temp renamed');

    await roleApi.remove(created.id);
    expect((await roleApi.list()).some((role) => role.id === created.id)).toBe(false);
  });
});

describe('role permission matrix over MSW', () => {
  const ownerId = roleIdByName.get('owner')!;
  const agentId = roleIdByName.get('agent')!;

  it('reads each role permission set (owner holds all, agent a subset)', async () => {
    const owner = await rolePermissionApi.listForRole(ownerId);
    const agent = await rolePermissionApi.listForRole(agentId);

    expect(owner).toHaveLength(permissionRows.length);
    expect(agent.length).toBeGreaterThan(0);
    expect(agent.length).toBeLessThan(permissionRows.length);
  });

  it('adds then removes a permission on a role', async () => {
    const agentPerms = new Set(await rolePermissionApi.listForRole(agentId));
    const missing = permissionRows.find((permission) => !agentPerms.has(permission.id))!;

    await rolePermissionApi.add(agentId, missing.id);
    expect(await rolePermissionApi.listForRole(agentId)).toContain(missing.id);

    await rolePermissionApi.remove(agentId, missing.id);
    expect(await rolePermissionApi.listForRole(agentId)).not.toContain(missing.id);
  });
});
