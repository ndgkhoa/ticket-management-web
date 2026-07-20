import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_PAGE_SIZE } from '~/lib/list-query';
import {
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';
import { DataTablePagination } from '~/components/data-table/data-table-pagination';
import { DataTableSkeleton } from '~/components/data-table/data-table-skeleton';

type Props<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId: (row: TData) => string;
  isLoading?: boolean;
  emptyState?: ReactNode;
};

export function ClientDataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyState,
}: Props<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getColumnCanGlobalFilter: (column) => ['name', 'description', 'code'].includes(column.id),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  const columnCount = table.getAllLeafColumns().length;
  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      {}
      <div className="relative w-full md:max-w-90">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={t('Common.Search')}
          className="h-8 pl-8"
          aria-label={t('Common.Search')}
        />
      </div>

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
            ) : rows.length > 0 ? (
              rows.map((row) => (
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
                <TableCell colSpan={columnCount} className="text-muted-foreground h-48 text-center">
                  {}
                  {data.length === 0 ? emptyState : t('Common.NoResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {}
      {table.getPageCount() > 1 && <DataTablePagination table={table} totalCount={filteredCount} />}
    </div>
  );
}
