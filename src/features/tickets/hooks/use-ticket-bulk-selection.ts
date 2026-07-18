import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { RowSelectionState } from '@tanstack/react-table';

import { useBulkUpdateTickets } from '~/features/tickets/api/ticket-queries';
import type { BulkTicketPatch } from '~/features/tickets/api/ticket-api';
import { toTicketListParams } from '~/features/tickets/schemas/ticket-search-schema';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

type Args = {
  search: TicketSearch;
  /** The current page of rows — used to tell when the whole page is selected. */
  rows: Ticket[];
  /** Total rows matching the filters — the "select all matching" target. */
  totalCount: number;
};

/**
 * Bulk-selection state and the apply action for the ticket list. Selection is page-scoped
 * (keyed by ticket id) and clears on any change to the list view, so a bulk action never
 * targets a stale selection; `selectAllMatching` is the Gmail-style escape hatch that
 * targets the whole filtered set instead of the visible page.
 *
 * Extracted from the page so the selection rules can be read (and tested) on their own.
 */
export function useTicketBulkSelection({ search, rows, totalCount }: Args) {
  const { t } = useTranslation();
  const bulkMutation = useBulkUpdateTickets();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  const selectedIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, selected]) => selected)
        .map(([id]) => id),
    [rowSelection]
  );
  const allPageSelected = rows.length > 0 && rows.every((row) => rowSelection[row.id]);
  // Offer "select all matching" only when there is more than this page to select, and no
  // free-text search is active — a keyword set can't be re-run server-side by the bulk RPC
  // without duplicating the list's FTS/trigram fallback, so the escape hatch stays off then.
  const canSelectAllMatching = !search.q && totalCount > rows.length;

  // Selection is scoped to the current view: any change to page/filters/sort/search clears
  // it (and abandons the escape hatch), so a bulk action never targets a stale selection.
  const listSignature = JSON.stringify([
    search.page,
    search.pageSize,
    search.sort,
    search.dir,
    search.q,
    search.status,
    search.priority,
    search.assigneeIds,
    search.teamIds,
    search.categoryIds,
    search.tagIds,
  ]);
  useEffect(() => {
    setRowSelection({});
    setSelectAllMatching(false);
  }, [listSignature]);

  // Deselecting any row on a fully-selected page abandons the "all matching" escape hatch.
  useEffect(() => {
    if (!allPageSelected) setSelectAllMatching(false);
  }, [allPageSelected]);

  const clearSelection = () => {
    setRowSelection({});
    setSelectAllMatching(false);
  };

  const applyBulk = (patch: BulkTicketPatch) => {
    // The escape hatch sends the active filters to the server (RLS re-checked there),
    // never a list of ids; a page-scoped selection sends exactly its ids.
    const filters = selectAllMatching ? toTicketListParams(search).filters : { id: selectedIds };
    bulkMutation.mutate(
      { filters, patch },
      {
        onSuccess: (count) => {
          toast.success(t('Bulk.Updated', { count }));
          clearSelection();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return {
    rowSelection,
    setRowSelection,
    selectedIds,
    allPageSelected,
    canSelectAllMatching,
    selectAllMatching,
    enableSelectAllMatching: () => setSelectAllMatching(true),
    clearSelection,
    applyBulk,
    pending: bulkMutation.isPending,
  };
}
