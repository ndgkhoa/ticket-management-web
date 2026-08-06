import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoleFormDialog } from '~/features/admin/roles/components/role-form-dialog';
import type { Role } from '~/features/admin/roles/schemas/role-schema';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  createPending: { value: false },
  updatePending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/roles/api/role-queries', () => ({
  useRoleCreate: () => ({ mutate: mocks.createMutate, isPending: mocks.createPending.value }),
  useRoleUpdate: () => ({ mutate: mocks.updateMutate, isPending: mocks.updatePending.value }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const ROLE = { id: 'r1', name: 'Agent', description: 'Handles tickets' } as Role;

const renderDialog = async (role?: Role | null) => {
  const onOpenChange = vi.fn();
  const rendered = await render(<RoleFormDialog open onOpenChange={onOpenChange} role={role} />);
  return { onOpenChange, ...rendered };
};

const save = () => screen.getByRole('button', { name: 'Save' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createPending.value = false;
  mocks.updatePending.value = false;
});

describe('RoleFormDialog in create mode', () => {
  it('titles itself as a create and starts empty', async () => {
    await renderDialog();

    expect(screen.getByRole('heading', { name: 'Create role' })).toBeInTheDocument();
    expect(screen.getByLabelText('Role Name')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('creates the role with trimmed values', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Role Name'), '  Supervisor  ');
    await user.type(screen.getByLabelText('Description'), '  Runs the queue  ');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Supervisor', description: 'Runs the queue' },
      expect.anything()
    );
    expect(mocks.updateMutate).not.toHaveBeenCalled();
  });

  it('sends a null description rather than an empty string', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Role Name'), 'Supervisor');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Supervisor', description: null },
      expect.anything()
    );
  });

  it('refuses to submit without a name', async () => {
    const { user } = await renderDialog();

    await user.click(save());

    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });
});

describe('RoleFormDialog in edit mode', () => {
  it('titles itself as an update and prefills the role', async () => {
    await renderDialog(ROLE);

    expect(screen.getByRole('heading', { name: 'Update role' })).toBeInTheDocument();
    expect(screen.getByLabelText('Role Name')).toHaveValue('Agent');
    expect(screen.getByLabelText('Description')).toHaveValue('Handles tickets');
  });

  it('updates the existing role by id', async () => {
    const { user } = await renderDialog(ROLE);

    await user.clear(screen.getByLabelText('Role Name'));
    await user.type(screen.getByLabelText('Role Name'), 'Lead agent');
    await user.click(save());

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      { id: 'r1', input: { name: 'Lead agent', description: 'Handles tickets' } },
      expect.anything()
    );
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });
});

describe('RoleFormDialog outcomes', () => {
  it('closes itself once the save succeeds', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) => handlers.onSuccess());
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Role Name'), 'Supervisor');
    await user.click(save());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('stays open and surfaces the error when the save fails', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('name taken'))
    );
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Role Name'), 'Supervisor');
    await user.click(save());

    expect(mocks.toast.error).toHaveBeenCalledWith('name taken');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('closes without saving when cancelled', async () => {
    const { onOpenChange, user } = await renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('locks the form while a save is in flight', async () => {
    mocks.createPending.value = true;
    await renderDialog();

    expect(screen.getByLabelText('Role Name')).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
