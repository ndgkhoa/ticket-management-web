import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options';
import { useDebouncedValue } from '~/components/data-table/use-debounced-value';

type Props<TData> = {
  table: Table<TData>;
  /** Current keyword (from the URL). Undefined when no search is active. */
  search?: string;
  onSearchChange: (value: string | undefined) => void;
  searchPlaceholder?: string;
  /** Filter controls (faceted filters) rendered between search and view options. */
  filters?: ReactNode;
  /** Whether any filter/search is active — shows the reset button. */
  isFiltered?: boolean;
  onReset?: () => void;
};

/**
 * List toolbar: a debounced search box, a slot for faceted filters, a reset button
 * when anything is active, and the column-visibility menu.
 *
 * The search input keeps its own responsive local state and only writes the settled
 * value out through `onSearchChange` (300ms debounce), so typing doesn't fire a
 * request per keystroke. The URL stays the source of truth — when it changes from
 * elsewhere (a shared link, back button), the input syncs to it.
 */
export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  isFiltered = false,
  onReset,
}: Props<TData>) {
  const [value, setValue] = useState(search ?? '');
  const debounced = useDebouncedValue(value, 300);

  // Push the settled input out to the URL. Blank collapses to undefined so the search
  // clause is dropped, not run against ''.
  useEffect(() => {
    onSearchChange(debounced.trim() === '' ? undefined : debounced.trim());
    // onSearchChange identity is the caller's concern; depending on `debounced` only
    // keeps this to "write when the settled value changes".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Keep the box in step when the URL query changes from outside this input.
  useEffect(() => {
    setValue(search ?? '');
  }, [search]);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-8 w-[180px] lg:w-[260px]"
      />
      {filters}
      {isFiltered && onReset && (
        <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3" onClick={onReset}>
          Reset
          <X className="ml-2 size-4" />
        </Button>
      )}
      <DataTableViewOptions table={table} />
    </div>
  );
}
