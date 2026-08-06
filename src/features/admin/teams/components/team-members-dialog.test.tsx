import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamMembersDialog } from '~/features/admin/teams/components/team-members-dialog';
import type { Team } from '~/features/admin/teams/schemas/team-schema';
import { render, screen, within } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  useTeamMembers: vi.fn(),
  useAssigneeOptions: vi.fn(),
  addMutate: vi.fn(),
  removeMutate: vi.fn(),
  addPending: { value: false },
  removePending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/teams/api/team-member-queries', () => ({
  useTeamMembers: mocks.useTeamMembers,
  useAddTeamMember: () => ({ mutate: mocks.addMutate, isPending: mocks.addPending.value }),
  useRemoveTeamMember: () => ({ mutate: mocks.removeMutate, isPending: mocks.removePending.value }),
}));

vi.mock('~/features/tickets/api/assignee-queries', () => ({
  useAssigneeOptions: mocks.useAssigneeOptions,
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const TEAM = { id: 'team-1', name: 'Support' } as Team;

const AGENTS = [
  { id: 'u1', fullName: 'Khoa', avatarUrl: null },
  { id: 'u2', fullName: 'Mai', avatarUrl: null },
];

const renderDialog = () => render(<TeamMembersDialog open onOpenChange={vi.fn()} team={TEAM} />);

const rowFor = (name: string) => screen.getByText(name).closest('li')!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.addPending.value = false;
  mocks.removePending.value = false;
  mocks.useTeamMembers.mockReturnValue({ data: ['u1'], isPending: false });
  mocks.useAssigneeOptions.mockReturnValue({ data: AGENTS, isPending: false });
});

describe('TeamMembersDialog', () => {
  it('titles the dialog with the team being edited', async () => {
    await renderDialog();

    expect(screen.getByRole('heading', { name: /Manage members — Support/ })).toBeInTheDocument();
  });

  it('offers remove for a current member and add for everyone else', async () => {
    await renderDialog();

    expect(
      within(rowFor('Khoa')).getByRole('button', { name: 'Delete Members' })
    ).toBeInTheDocument();
    expect(within(rowFor('Mai')).getByRole('button', { name: 'Add member' })).toBeInTheDocument();
  });

  it('adds the chosen agent to this team', async () => {
    const { user } = await renderDialog();

    await user.click(within(rowFor('Mai')).getByRole('button', { name: 'Add member' }));

    expect(mocks.addMutate).toHaveBeenCalledWith('u2', expect.anything());
  });

  it('removes the chosen member from this team', async () => {
    const { user } = await renderDialog();

    await user.click(within(rowFor('Khoa')).getByRole('button', { name: 'Delete Members' }));

    expect(mocks.removeMutate).toHaveBeenCalledWith('u1', expect.anything());
  });

  it('surfaces a failed add as a toast', async () => {
    mocks.addMutate.mockImplementationOnce((_id, options) =>
      options?.onError?.(new Error('already a member'))
    );
    const { user } = await renderDialog();

    await user.click(within(rowFor('Mai')).getByRole('button', { name: 'Add member' }));

    expect(mocks.toast.error).toHaveBeenCalledWith('already a member');
  });

  it('surfaces a failed remove as a toast', async () => {
    mocks.removeMutate.mockImplementationOnce((_id, options) =>
      options?.onError?.(new Error('last member'))
    );
    const { user } = await renderDialog();

    await user.click(within(rowFor('Khoa')).getByRole('button', { name: 'Delete Members' }));

    expect(mocks.toast.error).toHaveBeenCalledWith('last member');
  });

  it('disables the add buttons while an add is in flight', async () => {
    mocks.addPending.value = true;
    await renderDialog();

    expect(within(rowFor('Mai')).getByRole('button', { name: 'Add member' })).toBeDisabled();
  });

  it('falls back to a dash when an agent has no name', async () => {
    mocks.useAssigneeOptions.mockReturnValue({
      data: [{ id: 'u3', fullName: null, avatarUrl: null }],
      isPending: false,
    });
    await renderDialog();

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('waits for both queries before listing anyone', async () => {
    mocks.useTeamMembers.mockReturnValue({ data: undefined, isPending: true });
    await renderDialog();

    expect(screen.queryByRole('listitem')).toBeNull();
    expect(screen.queryByText('No members yet')).toBeNull();
  });

  it('reports an empty agent roster', async () => {
    mocks.useAssigneeOptions.mockReturnValue({ data: [], isPending: false });
    await renderDialog();

    expect(screen.getByText('No members yet')).toBeInTheDocument();
  });
});
