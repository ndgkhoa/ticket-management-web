import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';

import Teams from '~/features/admin/teams/pages/teams';
import type { Team } from '~/features/admin/teams/schemas/team-schema';
import { render, screen, within } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  useTeamList: vi.fn(),
  removeMutate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/teams/api/team-queries', () => ({
  useTeamList: mocks.useTeamList,
  useTeamRemove: () => ({ mutate: mocks.removeMutate, isPending: false }),
  useTeamCreate: () => ({ mutate: vi.fn(), isPending: false }),
  useTeamUpdate: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('~/features/admin/teams/components/team-members-dialog', () => ({
  TeamMembersDialog: ({ team }: { team: Team }) => (
    <div data-testid="members-dialog">{team.name}</div>
  ),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const TEAMS = [
  { id: 't1', name: 'Technical', description: 'Bugs, outages and integrations' },
  { id: 't2', name: 'Billing', description: null },
] as Team[];

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useTeamList.mockReturnValue({
    data: TEAMS,
    isPending: false,
    isError: false,
    error: null,
  } as UseQueryResult<Team[], Error>);
});

describe('Teams', () => {
  it('lists every team and dashes a missing description', async () => {
    await render(<Teams />);

    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(within(rowFor('Billing')).getByText('—')).toBeInTheDocument();
  });

  it('lets any team be deleted', async () => {
    await render(<Teams />);

    expect(
      within(rowFor('Technical')).getByRole('button', { name: 'Delete team' })
    ).toBeInTheDocument();
  });

  it('opens the membership editor for the chosen team', async () => {
    const { user } = await render(<Teams />);

    await user.click(within(rowFor('Billing')).getByRole('button', { name: 'Manage members' }));

    expect(screen.getByTestId('members-dialog')).toHaveTextContent('Billing');
  });

  it('keeps the membership editor closed until it is asked for', async () => {
    await render(<Teams />);

    expect(screen.queryByTestId('members-dialog')).toBeNull();
  });
});
