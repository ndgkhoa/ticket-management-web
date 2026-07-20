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
  rows: Ticket[];
  totalCount: number;
};

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
  const canSelectAllMatching = !search.q && totalCount > rows.length;

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

  useEffect(() => {
    if (!allPageSelected) setSelectAllMatching(false);
  }, [allPageSelected]);

  const clearSelection = () => {
    setRowSelection({});
    setSelectAllMatching(false);
  };

  const applyBulk = (patch: BulkTicketPatch) => {
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
