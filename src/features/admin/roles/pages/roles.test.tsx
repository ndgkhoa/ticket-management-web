import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';

import Roles from '~/features/admin/roles/pages/roles';
import type { Role } from '~/features/admin/roles/schemas/role-schema';
import { render, screen, within } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  useRoleList: vi.fn(),
  removeMutate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/roles/api/role-queries', () => ({
  useRoleList: mocks.useRoleList,
  useRoleRemove: () => ({ mutate: mocks.removeMutate, isPending: false }),
  useRoleCreate: () => ({ mutate: vi.fn(), isPending: false }),
  useRoleUpdate: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('~/features/admin/roles/components/role-permissions-dialog', () => ({
  RolePermissionsDialog: ({ role }: { role: Role }) => (
    <div data-testid="permissions-dialog">{role.name}</div>
  ),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const ROLES = [
  { id: 'r1', name: 'Owner', description: 'Everything', isSystem: true },
  { id: 'r2', name: 'Agent', description: null, isSystem: false },
] as Role[];

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useRoleList.mockReturnValue({
    data: ROLES,
    isPending: false,
    isError: false,
    error: null,
  } as UseQueryResult<Role[], Error>);
});

describe('Roles', () => {
  it('marks a built-in role and shows a dash for a missing description', async () => {
    await render(<Roles />);

    expect(within(rowFor('Owner')).getByText('System')).toBeInTheDocument();
    expect(within(rowFor('Agent')).queryByText('System')).toBeNull();
    expect(within(rowFor('Agent')).getByText('—')).toBeInTheDocument();
  });

  it('protects a system role from deletion but allows deleting a custom one', async () => {
    await render(<Roles />);

    expect(within(rowFor('Owner')).queryByRole('button', { name: 'Delete role' })).toBeNull();
    expect(
      within(rowFor('Agent')).getByRole('button', { name: 'Delete role' })
    ).toBeInTheDocument();
  });

  it('opens the permission matrix for the chosen role', async () => {
    const { user } = await render(<Roles />);

    await user.click(within(rowFor('Agent')).getByRole('button', { name: 'permissions of role' }));

    expect(screen.getByTestId('permissions-dialog')).toHaveTextContent('Agent');
  });

  it('keeps the permission matrix closed until it is asked for', async () => {
    await render(<Roles />);

    expect(screen.queryByTestId('permissions-dialog')).toBeNull();
  });
});
