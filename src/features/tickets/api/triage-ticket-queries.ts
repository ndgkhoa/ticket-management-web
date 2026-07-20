import { useMutation } from '@tanstack/react-query';

import { triageTicketApi } from '~/features/tickets/api/triage-ticket-api';

export const useTriageTicket = () => useMutation({ mutationFn: triageTicketApi.suggest });
