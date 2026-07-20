import { describe, expect, it } from 'vitest';

import { userApi } from '~/features/admin/users/api/user-api';
import { userRoleApi } from '~/features/admin/users/api/user-role-api';
import { demoUserByRole, roleIdByName, userRows } from '~/mocks/fixtures';

describe('user list over MSW', () => {
  it('paginates every profile', async () => {
    const { rows, totalCount } = await userApi.list({
      page: 1,
      pageSize: 100,
      filters: {},
    });

    expect(totalCount).toBe(userRows.length);
    expect(rows).toHaveLength(userRows.length);
  });

  it('narrows results by a keyword search on email', async () => {
    const target = demoUserByRole.get('agent')!;
    const needle = target.email.split('@')[0];

    const { rows, totalCount } = await userApi.list({
      page: 1,
      pageSize: 20,
      q: needle,
      filters: {},
    });

    expect(totalCount).toBeLessThan(userRows.length);
    expect(rows.every((row) => row.email.includes(needle))).toBe(true);
    expect(rows.some((row) => row.id === target.id)).toBe(true);
  });
});

describe('user role assignment over MSW', () => {
  const customer = demoUserByRole.get('customer')!;
  const customerRoleId = roleIdByName.get('customer')!;
  const agentRoleId = roleIdByName.get('agent')!;

  it('reads the roles a demo user holds', async () => {
    const roles = await userRoleApi.listForUser(customer.id);
    expect(roles).toContain(customerRoleId);
  });

  it('adds then removes a role on a user', async () => {
    expect(await userRoleApi.listForUser(customer.id)).not.toContain(agentRoleId);

    await userRoleApi.add(customer.id, agentRoleId);
    expect(await userRoleApi.listForUser(customer.id)).toContain(agentRoleId);

    await userRoleApi.remove(customer.id, agentRoleId);
    expect(await userRoleApi.listForUser(customer.id)).not.toContain(agentRoleId);
  });
});
