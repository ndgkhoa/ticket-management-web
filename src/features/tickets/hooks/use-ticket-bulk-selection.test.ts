import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '~/i18n';
import { useTicketBulkSelection } from '~/features/tickets/hooks/use-ticket-bulk-selection';
import {
  TICKET_SEARCH_DEFAULTS,
  type TicketSearch,
} from '~/features/tickets/schemas/ticket-search-schema';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/tickets/api/ticket-queries', () => ({
  useBulkUpdateTickets: () => ({ mutate: mocks.mutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const search = (overrides: Partial<TicketSearch> = {}) =>
  ({ ...TICKET_SEARCH_DEFAULTS, ...overrides }) as TicketSearch;

const rows = [{ id: 't1' }, { id: 't2' }] as Ticket[];

const setup = (args: { search?: TicketSearch; rows?: Ticket[]; totalCount?: number } = {}) =>
  renderHook(
    (props: Parameters<typeof useTicketBulkSelection>[0]) => useTicketBulkSelection(props),
    {
      initialProps: {
        search: args.search ?? search(),
        rows: args.rows ?? rows,
        totalCount: args.totalCount ?? 2,
      },
    }
  );

describe('useTicketBulkSelection', () => {
  it('derives selectedIds from the truthy entries of rowSelection', () => {
    const { result } = setup();

    act(() => result.current.setRowSelection({ t1: true, t2: false }));

    expect(result.current.selectedIds).toEqual(['t1']);
    expect(result.current.allPageSelected).toBe(false);
  });

  it('reports allPageSelected only when every row on the page is selected', () => {
    const { result } = setup();

    act(() => result.current.setRowSelection({ t1: true, t2: true }));

    expect(result.current.allPageSelected).toBe(true);
  });

  it('never reports allPageSelected for an empty page', () => {
    const { result } = setup({ rows: [], totalCount: 0 });

    expect(result.current.allPageSelected).toBe(false);
  });

  it('offers select-all-matching only when unsearched results exceed the page', () => {
    expect(setup({ totalCount: 9 }).result.current.canSelectAllMatching).toBe(true);
    expect(setup({ totalCount: 2 }).result.current.canSelectAllMatching).toBe(false);
    expect(
      setup({ search: search({ q: 'printer' }), totalCount: 9 }).result.current.canSelectAllMatching
    ).toBe(false);
  });

  it('drops the selection when the list query changes', () => {
    const { result, rerender } = setup();
    act(() => result.current.setRowSelection({ t1: true, t2: true }));
    act(() => result.current.enableSelectAllMatching());

    rerender({ search: search({ page: 2 }), rows, totalCount: 2 });

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectAllMatching).toBe(false);
  });

  it('keeps the selection when only an unrelated search key changes', () => {
    const { result, rerender } = setup();
    act(() => result.current.setRowSelection({ t1: true }));

    rerender({ search: search({ smart: true }), rows, totalCount: 2 });

    expect(result.current.selectedIds).toEqual(['t1']);
  });

  it('cancels select-all-matching as soon as the page is no longer fully selected', () => {
    const { result } = setup();
    act(() => result.current.setRowSelection({ t1: true, t2: true }));
    act(() => result.current.enableSelectAllMatching());
    expect(result.current.selectAllMatching).toBe(true);

    act(() => result.current.setRowSelection({ t1: true, t2: false }));

    expect(result.current.selectAllMatching).toBe(false);
  });

  it('sends the selected ids when select-all-matching is off', () => {
    const { result } = setup();
    act(() => result.current.setRowSelection({ t1: true, t2: true }));

    act(() => result.current.applyBulk({ status: 'closed' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { filters: { id: ['t1', 't2'] }, patch: { status: 'closed' } },
      expect.anything()
    );
  });

  it('sends the current filters instead of ids when select-all-matching is on', () => {
    const { result } = setup({ search: search({ status: ['open'], triage: true }), totalCount: 9 });
    act(() => result.current.setRowSelection({ t1: true, t2: true }));
    act(() => result.current.enableSelectAllMatching());

    act(() => result.current.applyBulk({ assigneeId: 'u9' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { filters: { status: ['open'], triage: 'true' }, patch: { assigneeId: 'u9' } },
      expect.anything()
    );
  });

  it('clears the selection and toasts the updated count on success', () => {
    mocks.mutate.mockImplementation((_vars, options) => options.onSuccess(3));
    const { result } = setup();
    act(() => result.current.setRowSelection({ t1: true, t2: true }));

    act(() => result.current.applyBulk({ status: 'closed' }));

    expect(mocks.toast.success).toHaveBeenCalledWith(expect.stringContaining('3'));
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectAllMatching).toBe(false);
  });

  it('keeps the selection and surfaces the error message on failure', () => {
    mocks.mutate.mockImplementation((_vars, options) => options.onError(new Error('boom')));
    const { result } = setup();
    act(() => result.current.setRowSelection({ t1: true }));

    act(() => result.current.applyBulk({ status: 'closed' }));

    expect(mocks.toast.error).toHaveBeenCalledWith('boom');
    expect(result.current.selectedIds).toEqual(['t1']);
  });
});
