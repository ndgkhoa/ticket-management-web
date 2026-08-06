import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAddTeamMember,
  useRemoveTeamMember,
  useTeamMembers,
} from '~/features/admin/teams/api/team-member-queries';
import { renderHookWithInvalidateSpy, renderHookWithProviders, waitFor } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  listIds: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('~/features/admin/teams/api/team-member-api', () => ({
  teamMemberApi: { listIds: mocks.listIds, add: mocks.add, remove: mocks.remove },
}));

const TEAM_ID = 'team-1';
const MEMBERS_KEY = { queryKey: ['team-members', TEAM_ID] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listIds.mockResolvedValue(['u1', 'u2']);
  mocks.add.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
});

describe('useTeamMembers', () => {
  it('loads the member ids for the given team', async () => {
    const { result } = renderHookWithProviders(() => useTeamMembers(TEAM_ID));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.listIds).toHaveBeenCalledWith(TEAM_ID);
    expect(result.current.data).toEqual(['u1', 'u2']);
  });

  it('keys the cache per team so two teams do not share a list', async () => {
    const first = renderHookWithProviders(() => useTeamMembers('team-1'));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    mocks.listIds.mockResolvedValue(['u9']);
    const second = renderHookWithProviders(() => useTeamMembers('team-2'));

    await waitFor(() => expect(second.result.current.data).toEqual(['u9']));
    expect(mocks.listIds).toHaveBeenLastCalledWith('team-2');
  });
});

describe('useAddTeamMember', () => {
  it('adds the user to the team and refreshes that team only', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(() => useAddTeamMember(TEAM_ID));

    result.current.mutate('u3');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.add).toHaveBeenCalledWith(TEAM_ID, 'u3');
    expect(invalidate).toHaveBeenCalledWith(MEMBERS_KEY);
  });

  it('leaves the cache alone when the api rejects', async () => {
    mocks.add.mockRejectedValue(new Error('already a member'));
    const { result, invalidate } = renderHookWithInvalidateSpy(() => useAddTeamMember(TEAM_ID));

    result.current.mutate('u3');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useRemoveTeamMember', () => {
  it('removes the user from the team and refreshes that team only', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(() => useRemoveTeamMember(TEAM_ID));

    result.current.mutate('u2');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.remove).toHaveBeenCalledWith(TEAM_ID, 'u2');
    expect(invalidate).toHaveBeenCalledWith(MEMBERS_KEY);
  });
});
