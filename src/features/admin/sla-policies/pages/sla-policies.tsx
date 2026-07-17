import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '~/components/data-table';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import {
  useSlaPolicyList,
  useSlaPolicyRemove,
} from '~/features/admin/sla-policies/api/sla-policy-queries';
import { SlaPolicyFormDialog } from '~/features/admin/sla-policies/components/sla-policy-form-dialog';
import type { SlaPolicy } from '~/features/admin/sla-policies/schemas/sla-policy-schema';

function SlaPolicies() {
  const { t } = useTranslation();
  const query = useSlaPolicyList();
  const remove = useSlaPolicyRemove();

  const columns: ColumnDef<SlaPolicy>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Fields.Name')} />,
    },
    {
      accessorKey: 'priority',
      header: t('Fields.Priority'),
      cell: ({ row }) => row.original.priority,
    },
    {
      accessorKey: 'first_response_mins',
      header: t('Fields.FirstResponseMins'),
    },
    {
      accessorKey: 'resolution_mins',
      header: t('Fields.ResolutionMins'),
    },
  ];

  return (
    <AdminCrudPage
      entityKey="Fields.SlaPolicy"
      query={query}
      remove={remove}
      columns={columns}
      renderForm={(props) => <SlaPolicyFormDialog {...props} policy={props.entity} />}
    />
  );
}

export default SlaPolicies;
