import { invokeAiFunction } from '~/features/tickets/api/ai-client';
import { aiReplyResultSchema } from '~/features/tickets/schemas/ai-schemas';

export type ThreadMessageInput = {
  author?: string;
  type: string;
  body: string;
};

export type SuggestReplyInput = {
  subject: string;
  messages: ThreadMessageInput[];
  cannedResponses?: string[];
};

/** Ask `ai-suggest-reply` for a draft agent reply built from the ticket thread. */
export const suggestReplyApi = {
  draft: (input: SuggestReplyInput) =>
    invokeAiFunction('ai-suggest-reply', input, aiReplyResultSchema),
};
