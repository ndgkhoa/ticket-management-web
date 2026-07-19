import { ticketMessageRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

/**
 * The mutable ticket-messages store, shared by the list handler and the realtime bus — the
 * message twin of `ticketStore`. A reply posted in one tab is broadcast and applied here in
 * another, so a refetch on that tab sees it (not just the spliced cache entry).
 */
export const ticketMessageStore = createTableStore(ticketMessageRows);
