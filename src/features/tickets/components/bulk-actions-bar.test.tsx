import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BulkActionsBar } from '~/features/tickets/components/bulk-actions-bar';
import { render, screen } from '~/testing/render';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
];

const ASSIGNEE_OPTIONS = [{ label: 'Khoa', value: 'u1' }];

type Overrides = Partial<Parameters<typeof BulkActionsBar>[0]>;

const renderBar = async (overrides: Overrides = {}) => {
  const onApply = vi.fn();
  const onClear = vi.fn();
  const onSelectAllMatching = vi.fn();

  const rendered = await render(
    <BulkActionsBar
      selectedCount={2}
      totalCount={50}
      allPageSelected={false}
      selectAllMatching={false}
      canSelectAllMatching={false}
      onSelectAllMatching={onSelectAllMatching}
      onClear={onClear}
      statusOptions={STATUS_OPTIONS}
      assigneeOptions={ASSIGNEE_OPTIONS}
      onApply={onApply}
      pending={false}
      {...overrides}
    />
  );

  return { onApply, onClear, onSelectAllMatching, ...rendered };
};

beforeEach(() => vi.clearAllMocks());

describe('BulkActionsBar counts', () => {
  it('counts the selected rows on this page', async () => {
    await renderBar();

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('counts every matching ticket once select-all-matching is on', async () => {
    await renderBar({ selectAllMatching: true, allPageSelected: true, canSelectAllMatching: true });

    expect(screen.getByText('50 selected')).toBeInTheDocument();
    expect(
      screen.getByText('All 50 tickets matching these filters are selected')
    ).toBeInTheDocument();
  });

  it('offers select-all-matching only when the page is fully selected and more exist', async () => {
    await renderBar({ allPageSelected: true, canSelectAllMatching: true });

    expect(
      screen.getByRole('button', { name: 'Select all 50 matching filters' })
    ).toBeInTheDocument();
  });

  it('hides the select-all-matching offer when the page is partly selected', async () => {
    await renderBar({ allPageSelected: false, canSelectAllMatching: true });

    expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
  });

  it('escalates the selection when the offer is taken', async () => {
    const { onSelectAllMatching, user } = await renderBar({
      allPageSelected: true,
      canSelectAllMatching: true,
    });

    await user.click(screen.getByRole('button', { name: 'Select all 50 matching filters' }));

    expect(onSelectAllMatching).toHaveBeenCalled();
  });
});

describe('BulkActionsBar actions', () => {
  it('applies a status straight away for a page selection', async () => {
    const { onApply, user } = await renderBar();

    await user.click(screen.getByRole('button', { name: /Set status/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Closed' }));

    expect(onApply).toHaveBeenCalledWith({ status: 'closed' });
  });

  it('applies an assignee straight away for a page selection', async () => {
    const { onApply, user } = await renderBar();

    await user.click(screen.getByRole('button', { name: /Assign to/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Khoa' }));

    expect(onApply).toHaveBeenCalledWith({ assigneeId: 'u1' });
  });

  it('unassigns without needing an assignee in the list', async () => {
    const { onApply, user } = await renderBar({ assigneeOptions: [] });

    await user.click(screen.getByRole('button', { name: /Assign to/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Unassign' }));

    expect(onApply).toHaveBeenCalledWith({ assigneeId: null });
  });

  it('clears the selection', async () => {
    const { onClear, user } = await renderBar();

    await user.click(screen.getByRole('button', { name: /Clear selection/ }));

    expect(onClear).toHaveBeenCalled();
  });

  it('disables the actions while an update is in flight', async () => {
    await renderBar({ pending: true });

    expect(screen.getByRole('button', { name: /Set status/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Assign to/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Clear selection/ })).toBeDisabled();
  });
});

describe('BulkActionsBar confirmation for a filter-wide update', () => {
  const selectAll = { selectAllMatching: true, allPageSelected: true, canSelectAllMatching: true };

  it('asks before touching every matching ticket', async () => {
    const { onApply, user } = await renderBar(selectAll);

    await user.click(screen.getByRole('button', { name: /Set status/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Closed' }));

    expect(screen.getByText('Update 50 tickets?')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('applies the held patch once confirmed', async () => {
    const { onApply, user } = await renderBar(selectAll);

    await user.click(screen.getByRole('button', { name: /Set status/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Closed' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ status: 'closed' });
  });

  it('drops the held patch when cancelled', async () => {
    const { onApply, user } = await renderBar(selectAll);

    await user.click(screen.getByRole('button', { name: /Set status/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Closed' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByText('Update 50 tickets?')).toBeNull();
  });
});
