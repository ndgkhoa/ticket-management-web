import { ticketMessageRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

export const ticketMessageStore = createTableStore(ticketMessageRows);
