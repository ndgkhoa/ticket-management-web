import { ListFilter, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';

import { Badge, Button, Input } from '~/components/ui';
import { cn } from '~/utils/cn';
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options';
import { useDebouncedValue } from '~/components/data-table/use-debounced-value';

type Props<TData> = {
  /**
   * The table instance — only needed for the column-visibility menu. `DataTable` owns
   * its table internally and doesn't expose it, so a screen using that wrapper omits
   * this and the view-options menu is simply not rendered.
   */
  table?: Table<TData>;
  /** Current keyword (from the URL). Undefined when no search is active. */
  search?: string;
  onSearchChange: (value: string | undefined) => void;
  searchPlaceholder?: string;
  /** Controls rendered inline next to search, always visible (e.g. a Smart-search toggle). */
  actions?: ReactNode;
  /** Faceted filters. Collapsed behind a "Filters" button and revealed on a second row. */
  filters?: ReactNode;
  /** How many faceted filters are active — shown as a badge on the Filters button. */
  filterCount?: number;
  /** Whether any filter/search is active — shows the reset button. */
  isFiltered?: boolean;
  onReset?: () => void;
};

/**
 * List toolbar: a debounced search box, a Smart-search slot, the faceted filters collapsed
 * behind one "Filters" button (with an active-count badge), a reset, and the
 * column-visibility menu when a table is supplied.
 *
 * The filters live on a second row that toggles open rather than crowding the first line —
 * with six facets, keeping them all inline overflowed and wrapped unpredictably. They stay
 * on their own toggled row (not in a popover) so each facet's own popover opens cleanly
 * without nesting.
 *
 * The search input keeps its own responsive local state and only writes the settled value
 * out through `onSearchChange` (300ms debounce), so typing doesn't fire a request per
 * keystroke. The URL stays the source of truth — when it changes elsewhere (a shared link,
 * back button), the input syncs to it.
 */
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
  // Keep the filters row open once revealed, and start open when arriving with filters
  // already active (a shared/deep link) so they aren't hidden.
  const [filtersOpen, setFiltersOpen] = useState(filterCount > 0);

  // Push the settled input out to the URL. Blank collapses to undefined so the search
  // clause is dropped, not run against ''.
  useEffect(() => {
    const next = debounced.trim() === '' ? undefined : debounced.trim();
    // Only write when the settled value actually differs from the URL. Without this
    // guard the effect fires on mount (and on every external URL sync) with the current
    // value, and since a `{ q }` patch is page-resetting, a deep-linked `?page=N` would
    // silently snap back to page 1.
    if (next === (search ?? undefined)) return;
    onSearchChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Keep the box in step when the URL query changes from outside this input.
  useEffect(() => {
    setValue(search ?? '');
  }, [search]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 md:max-w-[360px]">
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
