import { Inbox, SearchX } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '~/components/ui/button';
import { DataTable } from '~/components/data-table/data-table';
import { DataTableEmptyState } from '~/components/data-table/data-table-empty-state';

type Row = { id: string; subject: string; status: string };

const columns: ColumnDef<Row>[] = [
  { id: 'subject', accessorKey: 'subject', header: 'Subject' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
];

const rows: Row[] = Array.from({ length: 5 }, (_, i) => ({
  id: String(i + 1),
  subject: `Ticket #${i + 1}`,
  status: ['open', 'pending', 'solved'][i % 3],
}));

const meta = {
  title: 'Data/DataTable',
  component: DataTable<Row, unknown>,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Server-driven table: it renders the rows/total the server produced and reports paging/sort intent through handlers (it computes nothing). These stories cover the whole list contract — first-load skeleton, placeholder dimming on a page change, and distinct empty vs no-results states.',
      },
    },
  },
  args: {
    columns,
    data: rows,
    totalCount: rows.length,
    getRowId: (row) => row.id,
    pagination: { pageIndex: 0, pageSize: 20 },
    sorting: [],
    onPaginationChange: () => {},
    onSortingChange: () => {},
  },
} satisfies Meta<typeof DataTable<Row, unknown>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Server-provided rows with the `x–y of N` pager. */
export const Default: Story = {};

/** First load — skeleton rows matching the column count, so the shell doesn't resize. */
export const Loading: Story = { args: { isLoading: true } };

/** A page/sort change is fetching — the current rows dim (no unmount, no layout jump). */
export const PlaceholderDimming: Story = {
  args: { isPlaceholderData: true },
};

/** No data at all → an onboarding CTA. */
export const Empty: Story = {
  args: {
    data: [],
    totalCount: 0,
    isFiltered: false,
    emptyState: <DataTableEmptyState icon={Inbox} title="No tickets yet" />,
  },
};

/** Filters/search matched nothing → distinct copy + a clear action (not the empty state). */
export const NoResults: Story = {
  args: {
    data: [],
    totalCount: 0,
    isFiltered: true,
    noResultsState: (
      <DataTableEmptyState
        icon={SearchX}
        title="No results match your filters"
        action={
          <Button variant="outline" size="sm">
            Clear filters
          </Button>
        }
      />
    ),
  },
};
