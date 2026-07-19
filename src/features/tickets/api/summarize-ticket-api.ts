import { invokeAiFunction } from '~/features/tickets/api/ai-client';
import { aiSummaryResultSchema } from '~/features/tickets/schemas/ai-schemas';
import type { ThreadMessageInput } from '~/features/tickets/api/suggest-reply-api';

export type SummarizeInput = {
  subject: string;
  messages: ThreadMessageInput[];
};

/** Ask `ai-summarize` to condense a long ticket thread. */
export const summarizeTicketApi = {
  summarize: (input: SummarizeInput) =>
    invokeAiFunction('ai-summarize', input, aiSummaryResultSchema),
};
