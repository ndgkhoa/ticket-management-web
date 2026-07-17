import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '~/components/data-table';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import { useTeamList, useTeamRemove } from '~/features/admin/teams/api/team-queries';
import { TeamFormDialog } from '~/features/admin/teams/components/team-form-dialog';
import type { Team } from '~/features/admin/teams/schemas/team-schema';

function Teams() {
  const { t } = useTranslation();
  const query = useTeamList();
  const remove = useTeamRemove();

  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Fields.Name')} />,
    },
    {
      accessorKey: 'description',
      header: t('Fields.Description'),
      cell: ({ row }) => row.original.description ?? '—',
    },
  ];

  return (
    <AdminCrudPage
      entityKey="Fields.Team"
      query={query}
      remove={remove}
      columns={columns}
      renderForm={(props) => <TeamFormDialog {...props} team={props.entity} />}
    />
  );
}

export default Teams;
