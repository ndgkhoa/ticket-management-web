import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '~/components/data-table';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import { useTagList, useTagRemove } from '~/features/admin/tags/api/tag-queries';
import { TagFormDialog } from '~/features/admin/tags/components/tag-form-dialog';
import type { Tag } from '~/features/admin/tags/schemas/tag-schema';

function Tags() {
  const { t } = useTranslation();
  const query = useTagList();
  const remove = useTagRemove();

  const columns: ColumnDef<Tag>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Fields.Name')} />,
    },
    {
      accessorKey: 'color',
      header: t('Fields.Color'),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="size-4 rounded-full border"
            style={{ backgroundColor: row.original.color }}
          />
          {row.original.color}
        </span>
      ),
    },
  ];

  return (
    <AdminCrudPage
      entityKey="Fields.Tag"
      query={query}
      remove={remove}
      columns={columns}
      renderForm={(props) => <TagFormDialog {...props} tag={props.entity} />}
    />
  );
}

export default Tags;
