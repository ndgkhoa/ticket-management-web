import { ticketEventRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

/**
 * The one mutable ticket-events store, shared by the read handler and the audit synthesis.
 * The client can no longer write this table (the DB revoked the grant and dropped the insert
 * policy); every event now originates from a database trigger. MSW has no triggers, so the
 * ticket/message write handlers call `ticket-audit` to append here — the mock twin of those
 * triggers — and the read handler serves the result. Owned here (not inside `makeTableHandler`)
 * so both sides share the instance; `createTableStore` registers its own reset for tests.
 */
export const ticketEventStore = createTableStore(ticketEventRows);
