import { Skeleton, TableCell, TableRow } from '~/components/ui';

type Props = {
  columnCount: number;
  rowCount?: number;
};

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
