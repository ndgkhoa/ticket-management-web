import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamFormDialog } from '~/features/admin/teams/components/team-form-dialog';
import type { Team } from '~/features/admin/teams/schemas/team-schema';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  pending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/teams/api/team-queries', () => ({
  useTeamCreate: () => ({ mutate: mocks.createMutate, isPending: mocks.pending.value }),
  useTeamUpdate: () => ({ mutate: mocks.updateMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const TEAM = {
  id: 'team-1',
  name: 'Technical',
  description: 'Bugs, outages and integrations',
} as Team;

const renderDialog = async (team?: Team | null) => {
  const onOpenChange = vi.fn();
  const rendered = await render(<TeamFormDialog open onOpenChange={onOpenChange} team={team} />);
  return { onOpenChange, ...rendered };
};

const save = () => screen.getByRole('button', { name: 'Save' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.value = false;
});

describe('TeamFormDialog', () => {
  it('creates a team with trimmed values', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), '  Onboarding  ');
    await user.type(screen.getByLabelText('Description'), '  Account setup and migrations  ');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Onboarding', description: 'Account setup and migrations' },
      expect.anything()
    );
  });

  it('sends a null description rather than an empty string', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Onboarding');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Onboarding', description: null },
      expect.anything()
    );
  });

  it('prefills and updates an existing team by id', async () => {
    const { user } = await renderDialog(TEAM);

    expect(screen.getByLabelText('Name')).toHaveValue('Technical');
    await user.click(save());

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      { id: 'team-1', input: { name: 'Technical', description: 'Bugs, outages and integrations' } },
      expect.anything()
    );
  });

  it('refuses to submit without a name', async () => {
    const { user } = await renderDialog();

    await user.click(save());

    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('closes on success', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) => handlers.onSuccess());
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Onboarding');
    await user.click(save());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a failure without closing', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('name taken'))
    );
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Onboarding');
    await user.click(save());

    expect(mocks.toast.error).toHaveBeenCalledWith('name taken');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('locks the form while a save is in flight', async () => {
    mocks.pending.value = true;
    await renderDialog();

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
