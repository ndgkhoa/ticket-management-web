import { ticketRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

/**
 * The one mutable ticket store, shared by the list read handler and the bulk-update RPC
 * handler — the ticket twin of `userRolesStore`. A bulk status/assignee change mutates
 * this, and the next list read sees it, because both go through this same instance. Owns
 * the store here (not inside `makeTableHandler`) precisely so a second reader can share
 * it; it registers its own reset, so the test setup clears it between tests.
 */
export const ticketStore = createTableStore(ticketRows);
