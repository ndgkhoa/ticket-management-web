import { ChevronDown, UserMinus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui';
import type { FacetOption } from '~/components/data-table';
import type { BulkTicketPatch } from '~/features/tickets/api/ticket-api';
import type { TicketStatus } from '~/features/tickets/schemas/ticket-enums';

type Props = {
  /** Rows selected on the current page. */
  selectedCount: number;
  /** Total rows matching the active filters (the "select all matching" target). */
  totalCount: number;
  /** Whether every row on the current page is selected (gates the escape hatch). */
  allPageSelected: boolean;
  /** Whether the "select all matching filters" escape hatch is currently taken. */
  selectAllMatching: boolean;
  /** Whether the escape hatch may be offered — more than this page, no free-text search. */
  canSelectAllMatching: boolean;
  onSelectAllMatching: () => void;
  onClear: () => void;
  statusOptions: FacetOption[];
  assigneeOptions: FacetOption[];
  onApply: (patch: BulkTicketPatch) => void;
  pending: boolean;
};

/**
 * The bulk action bar over a ticket selection: change status or assignee for the selected
 * rows, with the Gmail-style "select all N matching" escape hatch when a whole page is
 * selected. An apply that targets the escape-hatch set (rows the user can't all see) is
 * gated behind a confirm dialog stating the count; a plain page-scoped apply runs directly.
 */
export function BulkActionsBar({
  selectedCount,
  totalCount,
  allPageSelected,
  selectAllMatching,
  canSelectAllMatching,
  onSelectAllMatching,
  onClear,
  statusOptions,
  assigneeOptions,
  onApply,
  pending,
}: Props) {
  const { t } = useTranslation();
  const effectiveCount = selectAllMatching ? totalCount : selectedCount;
  // The patch awaiting confirmation (escape-hatch applies only); null = no dialog open.
  const [pendingPatch, setPendingPatch] = useState<BulkTicketPatch | null>(null);

  const apply = (patch: BulkTicketPatch) => {
    if (selectAllMatching) setPendingPatch(patch);
    else onApply(patch);
  };

  return (
    <div className="bg-muted/60 flex flex-col gap-2 rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{t('Bulk.Selected', { count: effectiveCount })}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8" disabled={pending}>
              {t('Bulk.SetStatus')}
              <ChevronDown className="ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                // The options come from the status enum, so the value is a TicketStatus.
                onSelect={() => apply({ status: option.value as TicketStatus })}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8" disabled={pending}>
              {t('Bulk.Assign')}
              <ChevronDown className="ml-1 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuItem onSelect={() => apply({ assigneeId: null })}>
              <UserMinus className="mr-2 size-4" />
              {t('Bulk.Unassign')}
            </DropdownMenuItem>
            {assigneeOptions.length > 0 && <DropdownMenuSeparator />}
            {assigneeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => apply({ assigneeId: option.value })}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" className="h-8" onClick={onClear} disabled={pending}>
          <X className="mr-1 size-4" />
          {t('Bulk.Clear')}
        </Button>
      </div>

      {/* Escape hatch: only when the whole page is selected and there is more to select. */}
      {allPageSelected && canSelectAllMatching && (
        <div className="text-muted-foreground text-sm">
          {selectAllMatching ? (
            <span>{t('Bulk.AllMatchingSelected', { count: totalCount })}</span>
          ) : (
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={onSelectAllMatching}
            >
              {t('Bulk.SelectAllMatching', { count: totalCount })}
            </button>
          )}
        </div>
      )}

      {pendingPatch && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPendingPatch(null)}
          title={t('Bulk.ConfirmTitle', { count: totalCount })}
          description={t('Bulk.ConfirmDescription')}
          confirmLabel={t('Bulk.Apply')}
          cancelLabel={t('Common.Cancel')}
          loading={pending}
          onConfirm={() => {
            onApply(pendingPatch);
            setPendingPatch(null);
          }}
        />
      )}
    </div>
  );
}
