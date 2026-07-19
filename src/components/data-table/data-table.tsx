import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { cn } from '~/utils/cn';
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';
import { DataTablePagination } from '~/components/data-table/data-table-pagination';
import { DataTableSkeleton } from '~/components/data-table/data-table-skeleton';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalCount: number;
  getRowId: (row: TData) => string;

  // Controlled state, derived from the URL. The table computes nothing — the server
  // already paged and sorted — so these flow URL → table and the handlers write back.
  pagination: PaginationState;
  sorting: SortingState;
  onPaginationChange: OnChangeFn<PaginationState>;
  onSortingChange: OnChangeFn<SortingState>;

  /** First load — show skeleton rows. */
  isLoading?: boolean;
  /** A page/sort change is fetching — dim the current rows, never unmount them. */
  isPlaceholderData?: boolean;
  /** Whether any filter/search is active, to pick empty vs no-results messaging. */
  isFiltered?: boolean;

  // Row selection — opt-in. When enabled, a checkbox column is prepended (header selects
  // this page's rows only, matching the page-scoped selection contract). State is
  // controlled by the caller, keyed by `getRowId` (stable ticket id), so a bulk action
  // over the selection references real ids, never row indices.
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  toolbar?: ReactNode;
  /** Shown above the table when a selection is active — the bulk action bar + banner. */
  bulkBar?: ReactNode;
  /** No data at all — an onboarding CTA. */
  emptyState?: ReactNode;
  /** Filters/search matched nothing — echo the query + a clear action. */
  noResultsState?: ReactNode;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  totalCount,
  getRowId,
  pagination,
  sorting,
  onPaginationChange,
  onSortingChange,
  isLoading = false,
  isPlaceholderData = false,
  isFiltered = false,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  toolbar,
  bulkBar,
  emptyState,
  noResultsState,
}: DataTableProps<TData, TValue>) {
  // Prepend the checkbox column only when selection is on, so non-selectable tables are
  // untouched. The header toggles just this page's rows (`toggleAllPageRowsSelected`).
  const selectionColumn: ColumnDef<TData, TValue> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const tableColumns = enableRowSelection ? [selectionColumn, ...columns] : columns;

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId,
    // Server-driven: the table renders what it is handed and reports intent through
    // the handlers. `rowCount` gives it the total so the pager knows the page count.
    rowCount: totalCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableRowSelection,
    state: { pagination, sorting, ...(rowSelection ? { rowSelection } : {}) },
    onPaginationChange,
    onSortingChange,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
  });

  const columnCount = table.getAllLeafColumns().length;
  const hasRows = data.length > 0;

  return (
    <div className="space-y-3">
      {toolbar}

      {bulkBar}

      <div className="overflow-hidden rounded-md border">
        <div
          aria-busy={isPlaceholderData}
          className={cn(
            'transition-opacity',
            // Dim + lock while the next page loads; same DOM, so no layout jump.
            isPlaceholderData && 'pointer-events-none opacity-60'
          )}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <DataTableSkeleton columnCount={columnCount} rowCount={pagination.pageSize} />
              ) : hasRows ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-48 text-center">
                    {isFiltered ? noResultsState : emptyState}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Only when the data spans more than one page — a single page needs no pager or
          rows-per-page control. `getPageCount` reads the server total via `rowCount`. */}
      {table.getPageCount() > 1 && <DataTablePagination table={table} totalCount={totalCount} />}
    </div>
  );
}
