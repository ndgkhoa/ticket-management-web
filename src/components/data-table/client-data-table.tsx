import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { DataTablePagination } from '~/components/data-table/data-table-pagination';
import { DataTableSkeleton } from '~/components/data-table/data-table-skeleton';

type Props<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId: (row: TData) => string;
  /** First load — show skeleton rows. */
  isLoading?: boolean;
  toolbar?: ReactNode;
  /** No rows at all — an onboarding CTA. */
  emptyState?: ReactNode;
};

/**
 * The client-side twin of `DataTable`: for the bounded admin lookup tables (roles,
 * categories, tags, …) that fetch every row and sort + page in memory. Same shadcn table
 * shell and pagination bar, but the table owns its sorting/pagination rather than mirroring
 * the URL — there is no server round-trip to keep in step, and these tables are tens of
 * rows, so an in-memory model is the simpler correct thing (server paging them is
 * complexity for nothing).
 */
export function ClientDataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  isLoading = false,
  toolbar,
  emptyState,
}: Props<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const columnCount = table.getAllLeafColumns().length;
  const hasRows = data.length > 0;

  return (
    <div className="space-y-3">
      {toolbar}

      <div className="overflow-hidden rounded-md border">
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
              <DataTableSkeleton columnCount={columnCount} rowCount={5} />
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  {emptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && <DataTablePagination table={table} totalCount={data.length} />}
    </div>
  );
}
