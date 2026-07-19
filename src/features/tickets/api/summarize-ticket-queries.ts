import { useMutation } from '@tanstack/react-query';

import { summarizeTicketApi } from '~/features/tickets/api/summarize-ticket-api';

/** On-demand thread summary from the suggestion panel. */
export const useSummarizeTicket = () => useMutation({ mutationFn: summarizeTicketApi.summarize });
