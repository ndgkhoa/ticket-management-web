import { Inbox, SearchX, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';

import { Avatar, AvatarFallback, AvatarImage, Button, Container } from '~/components/ui';
import { TicketStatusBadge } from '~/features/tickets/components/ticket-status-badge';
import { TicketPriorityBadge } from '~/features/tickets/components/ticket-priority-badge';
import { ErrorPage } from '~/components/errors';
import {
  DataTable,
  DataTableColumnHeader,
  DataTableEmptyState,
  DataTableFacetedFilter,
  DataTableToolbar,
} from '~/components/data-table';
import type { PageSize } from '~/lib/list-query';
import { useTicketList } from '~/features/tickets/api/ticket-queries';
import { SavedViewsMenu } from '~/features/tickets/components/saved-views-menu';
import { BulkActionsBar } from '~/features/tickets/components/bulk-actions-bar';
import { useTicketSearchParams } from '~/features/tickets/hooks/use-ticket-search-params';
import { useTicketFilterOptions } from '~/features/tickets/hooks/use-ticket-filter-options';
import { useTicketBulkSelection } from '~/features/tickets/hooks/use-ticket-bulk-selection';
import { toTicketListParams } from '~/features/tickets/schemas/ticket-search-schema';
import {
  ticketPrioritySchema,
  ticketStatusSchema,
  type TicketPriority,
  type TicketStatus,
} from '~/features/tickets/schemas/ticket-enums';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

// Facet options are derived from the Zod enums, so a value added to the Postgres enum
// (and regenerated) shows up here without a second hand-maintained list.
const statusOptions = ticketStatusSchema.options.map((value) => ({ label: value, value }));
const priorityOptions = ticketPrioritySchema.options.map((value) => ({ label: value, value }));

function Tickets() {
  const { t } = useTranslation();
  const { search, setSearch, applySearch } = useTicketSearchParams();
  const ticketQuery = useTicketList(toTicketListParams(search));

  const rows = ticketQuery.data?.rows ?? [];
  const totalCount = ticketQuery.data?.totalCount ?? 0;

  const options = useTicketFilterOptions();
  const bulk = useTicketBulkSelection({ search, rows, totalCount });

  // Continuous row number across pages: the server pages the data, so the display index
  // is the page offset plus the row's position on the current page.
  const pageOffset = (search.page - 1) * search.pageSize;

  const columns: ColumnDef<Ticket>[] = [
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
      id: 'subject',
      accessorKey: 'subject',
      header: t('Fields.Subject'),
      enableSorting: false,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Fields.Status')} />,
      cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Fields.Priority')} />
      ),
      cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
    },
    {
      id: 'assignee',
      header: t('Fields.Assignee'),
      // Relation columns aren't sortable — the sort allowlist is on the ticket's own
      // columns, and ordering by a joined name isn't part of the list contract.
      enableSorting: false,
      cell: ({ row }) => {
        const agent = row.original.assigneeId
          ? options.assigneeById.get(row.original.assigneeId)
          : undefined;
        if (!agent) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={agent.avatarUrl ?? undefined} alt={agent.fullName ?? ''} />
              <AvatarFallback>
                <UserIcon className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            {agent.fullName ?? '—'}
          </span>
        );
      },
    },
    {
      id: 'team',
      header: t('Fields.Team'),
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.teamId
          ? options.teamNameById.get(row.original.teamId)
          : undefined;
        return <span className={name ? undefined : 'text-muted-foreground'}>{name ?? '—'}</span>;
      },
    },
    {
      id: 'category',
      header: t('Fields.Category'),
      enableSorting: false,
      cell: ({ row }) => {
        const name = row.original.categoryId
          ? options.categoryNameById.get(row.original.categoryId)
          : undefined;
        return <span className={name ? undefined : 'text-muted-foreground'}>{name ?? '—'}</span>;
      },
    },
  ];

  // URL → table: pagination is 0-based here, 1-based in the URL. A page-size change
  // routes through the hook's reset-to-page-1 rule; a page move only changes the page.
  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize };
  const sorting: SortingState = [{ id: search.sort, desc: search.dir === 'desc' }];

  const isFiltered = Boolean(
    search.q ||
    search.status?.length ||
    search.priority?.length ||
    search.assigneeIds?.length ||
    search.teamIds?.length ||
    search.categoryIds?.length ||
    search.tagIds?.length
  );

  const handleReset = () =>
    setSearch({
      q: undefined,
      status: undefined,
      priority: undefined,
      assigneeIds: undefined,
      teamIds: undefined,
      categoryIds: undefined,
      tagIds: undefined,
    });

  if (ticketQuery.isError) {
    return <ErrorPage subTitle={ticketQuery.error.message} />;
  }

  return (
    <Container
      title={t('Common.List', { name: t('Fields.Ticket_other') })}
      extraRight={<SavedViewsMenu search={search} onApply={applySearch} />}
    >
      <DataTable
        columns={columns}
        data={rows}
        totalCount={totalCount}
        getRowId={(row) => row.id}
        enableRowSelection
        rowSelection={bulk.rowSelection}
        onRowSelectionChange={bulk.setRowSelection}
        bulkBar={
          bulk.selectedIds.length > 0 ? (
            <BulkActionsBar
              selectedCount={bulk.selectedIds.length}
              totalCount={totalCount}
              allPageSelected={bulk.allPageSelected}
              selectAllMatching={bulk.selectAllMatching}
              canSelectAllMatching={bulk.canSelectAllMatching}
              onSelectAllMatching={bulk.enableSelectAllMatching}
              onClear={bulk.clearSelection}
              statusOptions={statusOptions}
              assigneeOptions={options.assigneeOptions}
              onApply={bulk.applyBulk}
              pending={bulk.pending}
            />
          ) : null
        }
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
              sort: next[0].id as TicketSearch['sort'],
              dir: next[0].desc ? 'desc' : 'asc',
            });
          }
        }}
        isLoading={ticketQuery.isPending}
        isPlaceholderData={ticketQuery.isPlaceholderData}
        isFiltered={isFiltered}
        toolbar={
          <DataTableToolbar
            search={search.q}
            onSearchChange={(value) => setSearch({ q: value }, { replace: true })}
            searchPlaceholder={t('Common.Search')}
            isFiltered={isFiltered}
            onReset={handleReset}
            filters={
              <>
                <DataTableFacetedFilter
                  title={t('Fields.Status')}
                  options={statusOptions}
                  selected={search.status ?? []}
                  onChange={(values) =>
                    setSearch({ status: values.length ? (values as TicketStatus[]) : undefined })
                  }
                />
                <DataTableFacetedFilter
                  title={t('Fields.Priority')}
                  options={priorityOptions}
                  selected={search.priority ?? []}
                  onChange={(values) =>
                    setSearch({
                      priority: values.length ? (values as TicketPriority[]) : undefined,
                    })
                  }
                />
                {options.assigneeOptions.length > 0 && (
                  <DataTableFacetedFilter
                    title={t('Fields.Assignee')}
                    options={options.assigneeOptions}
                    selected={search.assigneeIds ?? []}
                    onChange={(values) =>
                      setSearch({ assigneeIds: values.length ? values : undefined })
                    }
                  />
                )}
                {options.teamOptions.length > 0 && (
                  <DataTableFacetedFilter
                    title={t('Fields.Team')}
                    options={options.teamOptions}
                    selected={search.teamIds ?? []}
                    onChange={(values) =>
                      setSearch({ teamIds: values.length ? values : undefined })
                    }
                  />
                )}
                {options.categoryOptions.length > 0 && (
                  <DataTableFacetedFilter
                    title={t('Fields.Category')}
                    options={options.categoryOptions}
                    selected={search.categoryIds ?? []}
                    onChange={(values) =>
                      setSearch({ categoryIds: values.length ? values : undefined })
                    }
                  />
                )}
                {options.tagOptions.length > 0 && (
                  <DataTableFacetedFilter
                    title={t('Fields.Tags')}
                    options={options.tagOptions}
                    selected={search.tagIds ?? []}
                    onChange={(values) => setSearch({ tagIds: values.length ? values : undefined })}
                  />
                )}
              </>
            }
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
    </Container>
  );
}

export default Tickets;
