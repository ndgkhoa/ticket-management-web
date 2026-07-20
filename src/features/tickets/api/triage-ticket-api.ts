import { invokeAiFunction } from '~/features/tickets/api/ai-client';
import { aiTriageResultSchema } from '~/features/tickets/schemas/ai-schemas';

export type TriageInput = {
  subject: string;
  description: string;
  categories: string[];
};

export const triageTicketApi = {
  suggest: (input: TriageInput) => invokeAiFunction('ai-triage', input, aiTriageResultSchema),
};
