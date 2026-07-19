import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '~/components/data-table';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import {
  useCategoryList,
  useCategoryRemove,
} from '~/features/admin/categories/api/category-queries';
import { CategoryFormDialog } from '~/features/admin/categories/components/category-form-dialog';
import type { Category } from '~/features/admin/categories/schemas/category-schema';

function Categories() {
  const { t } = useTranslation();
  const query = useCategoryList();
  const remove = useCategoryRemove();

  const columns: ColumnDef<Category>[] = [
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
      entityKey="Fields.Category"
      query={query}
      remove={remove}
      columns={columns}
      renderForm={(props) => <CategoryFormDialog {...props} category={props.entity} />}
    />
  );
}

export default Categories;
