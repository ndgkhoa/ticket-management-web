import { Inbox, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';

import { Button, ConfirmDialog, Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import {
  ActionsHeader,
  DataTable,
  DataTableColumnHeader,
  DataTableEmptyState,
  DataTableToolbar,
} from '~/components/data-table';
import type { PageSize } from '~/lib/list-query';
import {
  useCannedResponseList,
  useCannedResponseRemove,
} from '~/features/admin/canned-responses/api/canned-response-queries';
import { useCannedResponseSearchParams } from '~/features/admin/canned-responses/hooks/use-canned-response-search-params';
import { toCannedResponseListParams } from '~/features/admin/canned-responses/schemas/canned-response-search-schema';
import type { CannedResponseSearch } from '~/features/admin/canned-responses/schemas/canned-response-search-schema';
import { CannedResponseFormDialog } from '~/features/admin/canned-responses/components/canned-response-form-dialog';
import type { CannedResponse } from '~/features/admin/canned-responses/schemas/canned-response-schema';

function CannedResponses() {
  const { t } = useTranslation();
  const { search, setSearch } = useCannedResponseSearchParams();
  const cannedResponseQuery = useCannedResponseList(toCannedResponseListParams(search));
  const remove = useCannedResponseRemove();

  const [formTarget, setFormTarget] = useState<{ open: boolean; entity: CannedResponse | null }>({
    open: false,
    entity: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<CannedResponse | null>(null);

  const pageOffset = (search.page - 1) * search.pageSize;

  const name = t('Fields.CannedResponse', { count: 1 });

  const columns: ColumnDef<CannedResponse>[] = [
    {
      id: 'index',
      header: t('Fields.Index'),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{pageOffset + row.index + 1}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Fields.Title')} />,
    },
    {
      id: 'body',
      accessorKey: 'body',
      header: t('Fields.Body'),
      enableSorting: false,
      cell: ({ row }) => <span className="line-clamp-1 max-w-md">{row.original.body}</span>,
    },
    {
      id: 'created_at',
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Fields.CreatedDate')} />
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: () => <ActionsHeader />,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Common.Edit')}
            onClick={() => setFormTarget({ open: true, entity: row.original })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('Common.Delete', { name })}
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize };
  const sorting: SortingState = [{ id: search.sort, desc: search.dir === 'desc' }];

  const isFiltered = Boolean(search.q);

  const handleReset = () => setSearch({ q: undefined });

  if (cannedResponseQuery.isError) {
    return <ErrorPage subTitle={cannedResponseQuery.error.message} />;
  }

  return (
    <Container
      title={t('Common.List', { name: t('Fields.CannedResponse', { count: 2 }) })}
      extraRight={
        <Button onClick={() => setFormTarget({ open: true, entity: null })}>
          <Plus className="size-4" />
          {t('Common.Create', { name })}
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={cannedResponseQuery.data?.rows ?? []}
        totalCount={cannedResponseQuery.data?.totalCount ?? 0}
        getRowId={(row) => row.id}
        pagination={pagination}
        sorting={sorting}
        onPaginationChange={(updater) => {
          const next = typeof updater === 'function' ? updater(pagination) : updater;
          if (next.pageSize !== search.pageSize) {
            setSearch({ pageSize: next.pageSize as PageSize });
          } else {
            setSearch({ page: next.pageIndex + 1 });
          }
        }}
        onSortingChange={(updater) => {
          const next = typeof updater === 'function' ? updater(sorting) : updater;
          if (next.length > 0) {
            setSearch({
              sort: next[0].id as CannedResponseSearch['sort'],
              dir: next[0].desc ? 'desc' : 'asc',
            });
          }
        }}
        isLoading={cannedResponseQuery.isPending}
        isPlaceholderData={cannedResponseQuery.isPlaceholderData}
        isFiltered={isFiltered}
        toolbar={
          <DataTableToolbar
            search={search.q}
            onSearchChange={(value) => setSearch({ q: value }, { replace: true })}
            searchPlaceholder={t('Common.Search')}
            isFiltered={isFiltered}
            onReset={handleReset}
          />
        }
        emptyState={<DataTableEmptyState icon={Inbox} title={t('Common.NoData')} />}
        noResultsState={
          <DataTableEmptyState
            icon={SearchX}
            title={t('Common.NoResults')}
            action={
              <Button variant="outline" size="sm" onClick={handleReset}>
                {t('Common.ClearFilters')}
              </Button>
            }
          />
        }
      />

      {}
      {formTarget.open && (
        <CannedResponseFormDialog
          open
          onOpenChange={(open) => setFormTarget((state) => ({ ...state, open }))}
          cannedResponse={formTarget.entity}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('Common.Delete', { name })}
        description={t('Common.ConfirmDelete', { name })}
        confirmLabel={t('Common.Delete', { name })}
        cancelLabel={t('Common.Cancel')}
        onConfirm={() =>
          deleteTarget &&
          remove.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
            onError: (error) => toast.error(error.message),
          })
        }
        loading={remove.isPending}
        destructive
      />
    </Container>
  );
}

export default CannedResponses;
