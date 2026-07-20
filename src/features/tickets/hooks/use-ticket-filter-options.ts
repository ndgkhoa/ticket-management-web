import { useMemo } from 'react';

import type { FacetOption } from '~/components/data-table';
import { useAssigneeOptions } from '~/features/tickets/api/assignee-queries';
import { useTeamList } from '~/features/admin/teams/api/team-queries';
import { useCategoryList } from '~/features/admin/categories/api/category-queries';
import { useTagList } from '~/features/admin/tags/api/tag-queries';
import type { Assignee } from '~/features/tickets/schemas/assignee-schema';

export type TicketFilterOptions = {
  assigneeOptions: FacetOption[];
  teamOptions: FacetOption[];
  categoryOptions: FacetOption[];
  tagOptions: FacetOption[];
  assigneeById: Map<string, Assignee>;
  teamNameById: Map<string, string>;
  categoryNameById: Map<string, string>;
};

export function useTicketFilterOptions(enabled = true): TicketFilterOptions {
  const assigneeQuery = useAssigneeOptions({ enabled });
  const teamQuery = useTeamList({ enabled });
  const categoryQuery = useCategoryList({ enabled });
  const tagQuery = useTagList({ enabled });

  const assigneeOptions = useMemo(
    () => (assigneeQuery.data ?? []).map((a) => ({ label: a.fullName ?? '—', value: a.id })),
    [assigneeQuery.data]
  );
  const teamOptions = useMemo(
    () => (teamQuery.data ?? []).map((team) => ({ label: team.name, value: team.id })),
    [teamQuery.data]
  );
  const categoryOptions = useMemo(
    () => (categoryQuery.data ?? []).map((c) => ({ label: c.name, value: c.id })),
    [categoryQuery.data]
  );
  const tagOptions = useMemo(
    () => (tagQuery.data ?? []).map((tag) => ({ label: tag.name, value: tag.id })),
    [tagQuery.data]
  );

  const assigneeById = useMemo(
    () => new Map((assigneeQuery.data ?? []).map((agent) => [agent.id, agent])),
    [assigneeQuery.data]
  );
  const teamNameById = useMemo(
    () => new Map((teamQuery.data ?? []).map((team) => [team.id, team.name])),
    [teamQuery.data]
  );
  const categoryNameById = useMemo(
    () => new Map((categoryQuery.data ?? []).map((category) => [category.id, category.name])),
    [categoryQuery.data]
  );

  return {
    assigneeOptions,
    teamOptions,
    categoryOptions,
    tagOptions,
    assigneeById,
    teamNameById,
    categoryNameById,
  };
}
