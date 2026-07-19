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
