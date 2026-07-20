import { ticketEventRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

export const ticketEventStore = createTableStore(ticketEventRows);
