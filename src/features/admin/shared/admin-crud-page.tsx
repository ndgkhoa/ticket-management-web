import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { Button, ConfirmDialog, Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { ActionsHeader, ClientDataTable } from '~/components/data-table';

type Entity = { id: string };

export type AdminEntityKey =
  'Fields.Category' | 'Fields.Tag' | 'Fields.Team' | 'Fields.SlaPolicy' | 'Fields.Role';

type Props<T extends Entity> = {
  entityKey: AdminEntityKey;
  query: UseQueryResult<T[], Error>;
  remove: UseMutationResult<void, Error, string>;
  columns: ColumnDef<T>[];
  renderForm: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entity: T | null;
  }) => ReactNode;
  rowActions?: (entity: T) => ReactNode;
  canDelete?: (entity: T) => boolean;
};

export function AdminCrudPage<T extends Entity>({
  entityKey,
  query,
  remove,
  columns,
  renderForm,
  rowActions,
  canDelete,
}: Props<T>) {
  const { t } = useTranslation();
  const [form, setForm] = useState<{ open: boolean; entity: T | null }>({
    open: false,
    entity: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  if (query.isError) return <ErrorPage subTitle={query.error.message} />;

  const singular = t(entityKey, { count: 1 });
  const rows = query.data ?? [];

  const indexColumn: ColumnDef<T> = {
    id: 'index',
    header: t('Fields.Index'),
    enableSorting: false,
    cell: ({ row, table }) =>
      table.getSortedRowModel().rows.findIndex((sorted) => sorted.id === row.id) + 1,
  };

  const actionsColumn: ColumnDef<T> = {
    id: 'actions',
    header: () => <ActionsHeader />,
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        {rowActions?.(row.original)}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('Common.Edit')}
          onClick={() => setForm({ open: true, entity: row.original })}
        >
          <Pencil className="size-4" />
        </Button>
        {(canDelete?.(row.original) ?? true) && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Common.Delete', { name: singular })}
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    ),
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Container
      title={t('Common.List', { name: t(entityKey, { count: 2 }) })}
      extraRight={
        <Button onClick={() => setForm({ open: true, entity: null })}>
          <Plus className="size-4" />
          {t('Common.Create', { name: singular })}
        </Button>
      }
    >
      <ClientDataTable
        columns={[indexColumn, ...columns, actionsColumn]}
        data={rows}
        getRowId={(row) => row.id}
        isLoading={query.isPending}
        emptyState={<span className="text-muted-foreground">{t('Common.NoData')}</span>}
      />

      {}
      {form.open &&
        renderForm({
          open: true,
          onOpenChange: (open) => setForm((state) => ({ ...state, open })),
          entity: form.entity,
        })}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('Common.Delete', { name: singular })}
        description={t('Common.ConfirmDelete', { name: singular })}
        confirmLabel={t('Common.Delete', { name: singular })}
        cancelLabel={t('Common.Cancel')}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        destructive
      />
    </Container>
  );
}
