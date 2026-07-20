import { useMutation } from '@tanstack/react-query';

import { summarizeTicketApi } from '~/features/tickets/api/summarize-ticket-api';

export const useSummarizeTicket = () => useMutation({ mutationFn: summarizeTicketApi.summarize });
