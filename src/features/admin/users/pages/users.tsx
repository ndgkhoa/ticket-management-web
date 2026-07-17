import { Inbox, SearchX, Shield, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';

import { Avatar, AvatarFallback, AvatarImage, Button, Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import {
  DataTable,
  DataTableColumnHeader,
  DataTableEmptyState,
  DataTableToolbar,
} from '~/components/data-table';
import type { PageSize } from '~/lib/list-query';
import { useUserList } from '~/features/admin/users/api/user-queries';
import { useUserSearchParams } from '~/features/admin/users/hooks/use-user-search-params';
import { toUserListParams } from '~/features/admin/users/schemas/user-search-schema';
import type { UserSearch } from '~/features/admin/users/schemas/user-search-schema';
import { UserRolesDialog } from '~/features/admin/users/components/user-roles-dialog';
import type { User } from '~/features/admin/users/schemas/user-schema';

/**
 * The server-side paginated user list — mirrors `tickets.tsx`, minus faceted filters
 * (profiles have no status/priority-like column to filter by). Role assignment opens
 * per-row through `UserRolesDialog`, kept as local state rather than URL state since
 * it never needs to be shareable via link.
 */
function Users() {
  const { t } = useTranslation();
  const { search, setSearch } = useUserSearchParams();
  const userQuery = useUserList(toUserListParams(search));
  // The user whose role dialog is open (null = closed).
  const [roleTarget, setRoleTarget] = useState<User | null>(null);

  // Continuous row number across pages: the server pages the data, so the display
  // index is the page offset plus the row's position on the current page.
  const pageOffset = (search.page - 1) * search.pageSize;

  const columns: ColumnDef<User>[] = [
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
      id: 'full_name',
      accessorKey: 'fullName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Fields.FullName')} />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarImage
              src={row.original.avatarUrl ?? undefined}
              alt={row.original.fullName ?? ''}
            />
            <AvatarFallback>
              <UserIcon className="size-4" />
            </AvatarFallback>
          </Avatar>
          {row.original.fullName ?? '—'}
        </span>
      ),
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Fields.Email')} />,
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
      header: t('Fields.Actions'),
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('Fields.UserRoles')}
          onClick={() => setRoleTarget(row.original)}
        >
          <Shield className="size-4" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // URL → table: pagination is 0-based here, 1-based in the URL. A page-size change
  // routes through the hook's reset-to-page-1 rule; a page move only changes the page.
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize };
  const sorting: SortingState = [{ id: search.sort, desc: search.dir === 'desc' }];

  const isFiltered = Boolean(search.q);

  const handleReset = () => setSearch({ q: undefined });

  if (userQuery.isError) {
    return <ErrorPage subTitle={userQuery.error.message} />;
  }

  return (
    <Container title={t('Common.List', { name: t('Fields.User_other') })}>
      <DataTable
        columns={columns}
        data={userQuery.data?.rows ?? []}
        totalCount={userQuery.data?.totalCount ?? 0}
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
              sort: next[0].id as UserSearch['sort'],
              dir: next[0].desc ? 'desc' : 'asc',
            });
          }
        }}
        isLoading={userQuery.isPending}
        isPlaceholderData={userQuery.isPlaceholderData}
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

      {roleTarget && (
        <UserRolesDialog
          open
          onOpenChange={(open) => !open && setRoleTarget(null)}
          user={roleTarget}
        />
      )}
    </Container>
  );
}

export default Users;
