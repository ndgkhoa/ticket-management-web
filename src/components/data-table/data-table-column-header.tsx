import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { Column } from '@tanstack/react-table';

import { cn } from '~/utils/cn';
import { Button } from '~/components/ui';

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: Props<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('data-[state=open]:bg-accent -ml-3 h-8', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      <span>{title}</span>
      {sorted === 'desc' ? (
        <ArrowDown className="ml-2 size-4" />
      ) : sorted === 'asc' ? (
        <ArrowUp className="ml-2 size-4" />
      ) : (
        <ChevronsUpDown className="ml-2 size-4" />
      )}
    </Button>
  );
}
