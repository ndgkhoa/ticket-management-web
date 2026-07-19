import { Inbox, Plus, SearchX, Sparkles, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';

import { Avatar, AvatarFallback, AvatarImage, Button, Container } from '~/components/ui';
import { cn } from '~/utils/cn';
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
import { useSemanticSearch } from '~/features/tickets/api/semantic-search-queries';
import { isAiEnabled } from '~/features/tickets/api/ai-client';
import { SavedViewsMenu } from '~/features/tickets/components/saved-views-menu';
import { BulkActionsBar } from '~/features/tickets/components/bulk-actions-bar';
import { useTicketSearchParams } from '~/features/tickets/hooks/use-ticket-search-params';
import { useTicketFilterOptions } from '~/features/tickets/hooks/use-ticket-filter-options';
import { useTicketBulkSelection } from '~/features/tickets/hooks/use-ticket-bulk-selection';
import { useTicketListRealtime } from '~/features/tickets/hooks/use-ticket-list-realtime';
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

  // Smart search: rank by semantic similarity instead of keyword match. Active only with
  // AI on, the toggle set, and a query present. On any semantic error it falls back to the
  // keyword results, so search is never unavailable (Phase 06 guarantees keyword works).
  const smartActive = search.smart && isAiEnabled && Boolean(search.q);
  const semanticQuery = useSemanticSearch(search.q, smartActive);
  const usingSemantic = smartActive && !semanticQuery.isError;

  // Semantic search is a single ranked top-N list, not a server-paged set — clamp it to
  // one page so the DataTable never renders a pager that would just re-show the same rows.
  const semanticRows = (semanticQuery.data ?? []).slice(0, search.pageSize);
  const rows = usingSemantic ? semanticRows : (ticketQuery.data?.rows ?? []);
  const totalCount = usingSemantic ? semanticRows.length : (ticketQuery.data?.totalCount ?? 0);

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
      cell: ({ row }) => (
        <Link
          to="/tickets/$ticketId"
          params={{ ticketId: row.original.id }}
          className="hover:text-primary font-medium hover:underline"
        >
          {row.original.subject}
        </Link>
      ),
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
    search.triage ||
    search.status?.length ||
    search.priority?.length ||
    search.assigneeIds?.length ||
    search.teamIds?.length ||
    search.categoryIds?.length ||
    search.tagIds?.length
  );

  // How many faceted filters are active (excludes the free-text query and Smart toggle) —
  // shown as a badge on the collapsed "Filters" button.
  const activeFilterCount = [
    search.status,
    search.priority,
    search.assigneeIds,
    search.teamIds,
    search.categoryIds,
    search.tagIds,
  ].filter((values) => values?.length).length;

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

  // A realtime change refetches quietly only when nothing would shift under the user: page 1,
  // default sort, no filter/search/selection, current data settled. Otherwise it raises a toast.
  const canAutoRefresh =
    search.page === 1 &&
    search.sort === 'created_at' &&
    search.dir === 'desc' &&
    !isFiltered &&
    bulk.selectedIds.length === 0 &&
    !ticketQuery.isPlaceholderData;
  const viewKey = JSON.stringify([
    search.page,
    search.pageSize,
    search.sort,
    search.dir,
    search.q,
    search.status,
    search.priority,
    search.assigneeIds,
    search.teamIds,
    search.categoryIds,
    search.tagIds,
    search.triage,
  ]);
  useTicketListRealtime({ canAutoRefresh, viewKey });

  // Only fail the page on a keyword error when we're actually showing keyword results —
  // in semantic mode the keyword query is irrelevant, and search must stay available.
  if (ticketQuery.isError && !usingSemantic) {
    return <ErrorPage subTitle={ticketQuery.error.message} />;
  }

  return (
    <Container
      title={t('Common.List', { name: t('Fields.Ticket_other') })}
      extraRight={
        <div className="flex items-center gap-2">
          <SavedViewsMenu search={search} onApply={applySearch} />
          <Button size="sm" className="h-8" asChild>
            <Link to="/tickets/new">
              <Plus className="mr-1 size-4" />
              {t('Common.Create', { name: t('Fields.Ticket_one') })}
            </Link>
          </Button>
        </div>
      }
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
        isLoading={usingSemantic ? semanticQuery.isPending : ticketQuery.isPending}
        isPlaceholderData={!usingSemantic && ticketQuery.isPlaceholderData}
        isFiltered={isFiltered}
        toolbar={
          <DataTableToolbar
            search={search.q}
            onSearchChange={(value) => setSearch({ q: value }, { replace: true })}
            searchPlaceholder={t('Common.Search')}
            isFiltered={isFiltered}
            onReset={handleReset}
            filterCount={activeFilterCount}
            actions={
              <>
                <Button
                  type="button"
                  variant={search.triage ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn('h-8', search.triage && 'border-primary')}
                  aria-pressed={search.triage}
                  onClick={() => setSearch({ triage: !search.triage })}
                >
                  <Inbox className="mr-1 size-4" />
                  {t('Tickets.Triage')}
                </Button>
                {isAiEnabled && (
                  <Button
                    type="button"
                    variant={search.smart ? 'secondary' : 'outline'}
                    size="sm"
                    className={cn('h-8', search.smart && 'border-primary')}
                    aria-pressed={search.smart}
                    onClick={() => setSearch({ smart: !search.smart })}
                  >
                    <Sparkles className="mr-1 size-4" />
                    {t('Ai.SmartSearch')}
                  </Button>
                )}
              </>
            }
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
