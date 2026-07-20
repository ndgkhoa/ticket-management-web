import { ticketRows } from '~/mocks/fixtures';
import { createTableStore } from '~/mocks/lib/table-store';

export const ticketStore = createTableStore(ticketRows);
