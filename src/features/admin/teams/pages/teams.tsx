import { Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '~/components/ui';
import { DataTableColumnHeader } from '~/components/data-table';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import { useTeamList, useTeamRemove } from '~/features/admin/teams/api/team-queries';
import { TeamFormDialog } from '~/features/admin/teams/components/team-form-dialog';
import { TeamMembersDialog } from '~/features/admin/teams/components/team-members-dialog';
import type { Team } from '~/features/admin/teams/schemas/team-schema';

function Teams() {
  const { t } = useTranslation();
  const query = useTeamList();
  const remove = useTeamRemove();
  // The team whose members dialog is open (null = closed).
  const [membersTeam, setMembersTeam] = useState<Team | null>(null);

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
    <>
      <AdminCrudPage
        entityKey="Fields.Team"
        query={query}
        remove={remove}
        columns={columns}
        rowActions={(team) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Teams.ManageMembers')}
            onClick={() => setMembersTeam(team)}
          >
            <Users className="size-4" />
          </Button>
        )}
        renderForm={(props) => <TeamFormDialog {...props} team={props.entity} />}
      />

      {membersTeam && (
        <TeamMembersDialog
          open
          onOpenChange={(open) => !open && setMembersTeam(null)}
          team={membersTeam}
        />
      )}
    </>
  );
}

export default Teams;
