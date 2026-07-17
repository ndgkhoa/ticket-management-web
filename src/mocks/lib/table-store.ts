/**
 * A mutable in-memory table seeded from the fixtures — what turns the MSW mock from a
 * read-only mirror into something the admin CRUD screens can write to in `msw` mode.
 *
 * Each store owns a working copy of its seed so a write never mutates the shared fixture
 * arrays (which also feed the seed SQL and the read handlers). Every store registers its
 * reset, and the test setup calls `resetTableStores()` between tests so a create in one
 * test can't leak into the next.
 */

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
    // New rows go to the front so a just-created row is visible without paging — the
    // fixtures carry no created_at on these lookup tables to order by.
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

/** Reset every store to its seed — called from the test setup so mutations don't leak. */
export function resetTableStores(): void {
  for (const reset of resets) reset();
}
