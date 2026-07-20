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

  pagination: PaginationState;
  sorting: SortingState;
  onPaginationChange: OnChangeFn<PaginationState>;
  onSortingChange: OnChangeFn<SortingState>;

  isLoading?: boolean;
  isPlaceholderData?: boolean;
  isFiltered?: boolean;

  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  toolbar?: ReactNode;
  bulkBar?: ReactNode;
  emptyState?: ReactNode;
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

      {}
      {table.getPageCount() > 1 && <DataTablePagination table={table} totalCount={totalCount} />}
    </div>
  );
}
