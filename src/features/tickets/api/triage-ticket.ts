import { useMutation } from '@tanstack/react-query';

import { invokeAiFunction } from '~/features/tickets/api/ai-client';
import { aiTriageResultSchema } from '~/features/tickets/schemas/ai-schemas';

export type TriageInput = {
  subject: string;
  description: string;
  /** Category names to choose from; the model picks one or none. */
  categories: string[];
};

/** Ask `ai-triage` to suggest a priority (and optional category) for a draft ticket. */
export const triageTicketApi = {
  suggest: (input: TriageInput) => invokeAiFunction('ai-triage', input, aiTriageResultSchema),
};

/**
 * On-demand triage from the create form. A mutation, not a query: it fires when the user
 * clicks "Suggest", not on every keystroke, so it never spends quota unasked.
 */
export const useTriageTicket = () => useMutation({ mutationFn: triageTicketApi.suggest });
