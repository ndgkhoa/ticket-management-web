import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge, Button } from '~/components/ui';
import { DataTableColumnHeader } from '~/components/data-table';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import { useRoleList, useRoleRemove } from '~/features/admin/roles/api/role-queries';
import { RoleFormDialog } from '~/features/admin/roles/components/role-form-dialog';
import { RolePermissionsDialog } from '~/features/admin/roles/components/role-permissions-dialog';
import type { Role } from '~/features/admin/roles/schemas/role-schema';

function Roles() {
  const { t } = useTranslation();
  const query = useRoleList();
  const remove = useRoleRemove();
  // The role whose permission matrix is open (null = closed).
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Fields.RoleName')} />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          {row.original.name}
          {row.original.isSystem && <Badge variant="secondary">{t('Common.System')}</Badge>}
        </span>
      ),
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
        entityKey="Fields.Role"
        query={query}
        remove={remove}
        columns={columns}
        // Seeded roles are load-bearing for RLS — the UI refuses to delete them.
        canDelete={(role) => !role.isSystem}
        rowActions={(role) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Fields.RolePermissions')}
            onClick={() => setPermissionsRole(role)}
          >
            <KeyRound className="size-4" />
          </Button>
        )}
        renderForm={(props) => <RoleFormDialog {...props} role={props.entity} />}
      />

      {permissionsRole && (
        <RolePermissionsDialog
          open
          onOpenChange={(open) => !open && setPermissionsRole(null)}
          role={permissionsRole}
        />
      )}
    </>
  );
}

export default Roles;
