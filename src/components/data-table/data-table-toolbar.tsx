import { ListFilter, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';

import { Badge, Button, Input } from '~/components/ui';
import { cn } from '~/utils/cn';
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options';
import { useDebouncedValue } from '~/components/data-table/use-debounced-value';

type Props<TData> = {
  table?: Table<TData>;
  search?: string;
  onSearchChange: (value: string | undefined) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  filterCount?: number;
  isFiltered?: boolean;
  onReset?: () => void;
};

export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  actions,
  filters,
  filterCount = 0,
  isFiltered = false,
  onReset,
}: Props<TData>) {
  const [value, setValue] = useState(search ?? '');
  const debounced = useDebouncedValue(value, 300);
  const [filtersOpen, setFiltersOpen] = useState(filterCount > 0);

  useEffect(() => {
    const next = debounced.trim() === '' ? undefined : debounced.trim();
    if (next === (search ?? undefined)) return;
    onSearchChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setValue(search ?? '');
  }, [search]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 md:max-w-90">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {filters && (
            <Button
              type="button"
              variant={filtersOpen ? 'secondary' : 'outline'}
              size="sm"
              className={cn('h-8', filtersOpen && 'border-primary')}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <ListFilter className="mr-1 size-4" />
              Filters
              {filterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 justify-center px-1">
                  {filterCount}
                </Badge>
              )}
            </Button>
          )}
          {isFiltered && onReset && (
            <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3" onClick={onReset}>
              Reset
              <X className="ml-2 size-4" />
            </Button>
          )}
          {table && <DataTableViewOptions table={table} />}
        </div>
      </div>

      {filters && filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">{filters}</div>
      )}
    </div>
  );
}
