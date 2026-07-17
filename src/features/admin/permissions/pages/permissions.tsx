import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { ClientDataTable, DataTableColumnHeader } from '~/components/data-table';
import { usePermissionList } from '~/features/admin/permissions/api/permission-queries';
import type { Permission } from '~/features/admin/permissions/schemas/permission-schema';

/**
 * The permission catalogue — read-only by design: the codes are fixed by the RLS
 * policies (editing them from the UI could only desync the two), so this is a searchable,
 * sortable list, not a CRUD screen. Assigning permissions to roles is the editable part,
 * and lives on the roles screen.
 */
function Permissions() {
  const { t } = useTranslation();
  const query = usePermissionList();

  if (query.isError) return <ErrorPage subTitle={query.error.message} />;

  const columns: ColumnDef<Permission>[] = [
    {
      id: 'index',
      header: t('Fields.Index'),
      enableSorting: false,
      cell: ({ row, table }) =>
        table.getSortedRowModel().rows.findIndex((sorted) => sorted.id === row.id) + 1,
    },
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Fields.PermissionCode')} />
      ),
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: 'description',
      header: t('Fields.Description'),
      cell: ({ row }) => row.original.description ?? '—',
    },
  ];

  return (
    <Container title={t('Common.List', { name: t('Fields.Permission', { count: 2 }) })}>
      <ClientDataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(permission) => permission.id}
        isLoading={query.isPending}
        emptyState={<span className="text-muted-foreground">{t('Common.NoData')}</span>}
      />
    </Container>
  );
}

export default Permissions;
