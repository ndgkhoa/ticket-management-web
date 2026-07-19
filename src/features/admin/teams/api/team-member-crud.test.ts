import { describe, expect, it } from 'vitest';

import { teamMemberApi } from '~/features/admin/teams/api/team-member-api';
import { agentUsers, teamMemberRows, teamRows } from '~/mocks/fixtures';

/**
 * Team membership CRUD over MSW — the surface that was missing, so a real deploy can add an
 * agent to a team (and thus grant them the team's ticket visibility). Pick an agent NOT
 * already in the target team so add/remove start from a known state.
 */
describe('team membership CRUD over MSW', () => {
  const teamId = teamRows[0].id;
  const membersOfTeam = new Set(
    teamMemberRows.filter((row) => row.team_id === teamId).map((row) => row.user_id)
  );
  const agentId = agentUsers.find((agent) => !membersOfTeam.has(agent.id))!.id;

  it('adds an agent to a team', async () => {
    const before = await teamMemberApi.listIds(teamId);
    expect(before).not.toContain(agentId);

    await teamMemberApi.add(teamId, agentId);

    const after = await teamMemberApi.listIds(teamId);
    expect(after).toContain(agentId);
    expect(after.length).toBe(before.length + 1);
  });

  it('removes an agent from a team', async () => {
    await teamMemberApi.add(teamId, agentId);
    await teamMemberApi.remove(teamId, agentId);

    const ids = await teamMemberApi.listIds(teamId);
    expect(ids).not.toContain(agentId);
  });
});
