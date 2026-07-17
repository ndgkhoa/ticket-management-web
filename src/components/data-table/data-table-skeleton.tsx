import { Skeleton } from '~/components/ui/skeleton';
import { TableCell, TableRow } from '~/components/ui/table';

type Props = {
  columnCount: number;
  rowCount?: number;
};

/**
 * Skeleton rows for the first load only, matching the real column count and row
 * height so the table shell doesn't resize when data lands. Subsequent page loads
 * dim the existing rows instead (no skeleton), which is what avoids the layout jump.
 */
export function DataTableSkeleton({ columnCount, rowCount = 10 }: Props) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columnCount }).map((_, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
