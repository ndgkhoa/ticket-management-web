import { useMutation } from '@tanstack/react-query';

import { triageTicketApi } from '~/features/tickets/api/triage-ticket-api';

/**
 * On-demand triage from the create form. A mutation, not a query: it fires when the user
 * clicks "Suggest", not on every keystroke, so it never spends quota unasked.
 */
export const useTriageTicket = () => useMutation({ mutationFn: triageTicketApi.suggest });
