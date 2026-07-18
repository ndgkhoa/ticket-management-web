import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';

import { render, screen } from '~/testing/render';
import { DataTable } from '~/components/data-table/data-table';

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];

const rows: Row[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Bravo' },
];

function renderTable(overrides: Partial<Parameters<typeof DataTable<Row, unknown>>[0]> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={rows}
      totalCount={rows.length}
      getRowId={(row) => row.id}
      pagination={{ pageIndex: 0, pageSize: 20 }}
      sorting={[]}
      onPaginationChange={vi.fn()}
      onSortingChange={vi.fn()}
      {...overrides}
    />
  );
}

describe('DataTable', () => {
  it('renders the server-provided rows', async () => {
    await renderTable();

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('hides the pager for a single page', async () => {
    // 2 rows at pageSize 20 → one page → no pager or rows-per-page control.
    await renderTable();

    expect(screen.queryByText('Rows per page')).not.toBeInTheDocument();
  });

  it('shows the pager with the server total across multiple pages', async () => {
    // 50 rows / pageSize 20 → 3 pages → the pager reads x–y of N from the server total.
    await renderTable({ totalCount: 50 });

    expect(screen.getByText('1–20 of 50')).toBeInTheDocument();
  });

  it('shows the empty state when there is no data and no filter', async () => {
    await renderTable({
      data: [],
      totalCount: 0,
      isFiltered: false,
      emptyState: <span>Create your first ticket</span>,
      noResultsState: <span>No matches</span>,
    });

    expect(screen.getByText('Create your first ticket')).toBeInTheDocument();
    expect(screen.queryByText('No matches')).not.toBeInTheDocument();
  });

  it('shows the no-results state when a filter matched nothing', async () => {
    await renderTable({
      data: [],
      totalCount: 0,
      isFiltered: true,
      emptyState: <span>Create your first ticket</span>,
      noResultsState: <span>No matches</span>,
    });

    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(screen.queryByText('Create your first ticket')).not.toBeInTheDocument();
  });

  it('dims rather than unmounts while the next page loads', async () => {
    await renderTable({ isPlaceholderData: true });

    // Rows stay in the DOM (no layout jump); the container is marked busy + dimmed.
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toHaveClass('opacity-60');
  });

  it('shows skeleton rows on first load, not the data', async () => {
    await renderTable({ isLoading: true });

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    // Skeleton rows use the animate-pulse class from the Skeleton primitive.
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
