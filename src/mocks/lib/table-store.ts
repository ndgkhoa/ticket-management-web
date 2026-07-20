type Identifiable = { id: string };

export type TableStore<Row extends Identifiable> = {
  all: () => Row[];
  insert: (row: Row) => Row;
  update: (id: string, patch: Partial<Row>) => Row | undefined;
  remove: (id: string) => Row | undefined;
  reset: () => void;
};

const resets: Array<() => void> = [];

export function createTableStore<Row extends Identifiable>(seed: readonly Row[]): TableStore<Row> {
  const clone = () => seed.map((row) => ({ ...row }));
  let rows: Row[] = clone();

  const reset = () => {
    rows = clone();
  };
  resets.push(reset);

  return {
    all: () => rows,
    insert: (row) => {
      rows = [row, ...rows];
      return row;
    },
    update: (id, patch) => {
      let updated: Row | undefined;
      rows = rows.map((row) => (row.id === id ? (updated = { ...row, ...patch }) : row));
      return updated;
    },
    remove: (id) => {
      const found = rows.find((row) => row.id === id);
      if (found) rows = rows.filter((row) => row.id !== id);
      return found;
    },
    reset,
  };
}

export type JunctionStore<Row> = {
  all: () => Row[];
  insert: (row: Row) => Row;
  removeWhere: (match: Record<string, string>) => void;
  reset: () => void;
};

export function createJunctionStore<Row extends Record<string, unknown>>(
  seed: readonly Row[]
): JunctionStore<Row> {
  const clone = () => seed.map((row) => ({ ...row }));
  let rows: Row[] = clone();

  const reset = () => {
    rows = clone();
  };
  resets.push(reset);

  const matches = (row: Row, match: Record<string, string>) =>
    Object.entries(match).every(([column, value]) => String(row[column]) === value);

  return {
    all: () => rows,
    insert: (row) => {
      const existing = rows.find((existingRow) =>
        Object.keys(row).every((column) => existingRow[column] === row[column])
      );
      if (existing) return existing;
      rows = [...rows, row];
      return row;
    },
    removeWhere: (match) => {
      if (Object.keys(match).length === 0) return;
      rows = rows.filter((row) => !matches(row, match));
    },
    reset,
  };
}

export function resetTableStores(): void {
  for (const reset of resets) reset();
}
