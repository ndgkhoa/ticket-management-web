import { useMutation } from '@tanstack/react-query';

import { invokeAiFunction } from '~/features/tickets/api/ai-client';
import { aiSummaryResultSchema } from '~/features/tickets/schemas/ai-schemas';
import type { ThreadMessageInput } from '~/features/tickets/api/suggest-reply';

export type SummarizeInput = {
  subject: string;
  messages: ThreadMessageInput[];
};

/** Ask `ai-summarize` to condense a long ticket thread. */
export const summarizeTicketApi = {
  summarize: (input: SummarizeInput) =>
    invokeAiFunction('ai-summarize', input, aiSummaryResultSchema),
};

/** On-demand thread summary from the suggestion panel. */
export const useSummarizeTicket = () => useMutation({ mutationFn: summarizeTicketApi.summarize });
