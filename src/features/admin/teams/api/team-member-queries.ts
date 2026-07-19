import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { teamMemberApi } from '~/features/admin/teams/api/team-member-api';

const teamMemberKeys = {
  members: (teamId: string) => ['team-members', teamId] as const,
};

export const useTeamMembers = (teamId: string) =>
  useQuery(
    queryOptions({
      queryKey: teamMemberKeys.members(teamId),
      queryFn: () => teamMemberApi.listIds(teamId),
    })
  );

export const useAddTeamMember = (teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => teamMemberApi.add(teamId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamMemberKeys.members(teamId) }),
  });
};

export const useRemoveTeamMember = (teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => teamMemberApi.remove(teamId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamMemberKeys.members(teamId) }),
  });
};
