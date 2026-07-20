import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button, Separator, Textarea } from '~/components/ui';
import { isAiEnabled } from '~/features/tickets/api/ai-client';
import { useSuggestReply } from '~/features/tickets/api/suggest-reply-queries';
import type { ThreadMessageInput } from '~/features/tickets/api/suggest-reply-api';
import { useSummarizeTicket } from '~/features/tickets/api/summarize-ticket-queries';
import { useCannedResponses } from '~/features/tickets/api/canned-response-queries';
import type { TicketMessage } from '~/features/tickets/schemas/ticket-message-schema';

type Props = {
  subject: string;
  messages: TicketMessage[];
  authorNameById: Map<string, string | null | undefined>;
  onUseDraft: (draft: string) => void;
};

export function AiSuggestionPanel({ subject, messages, authorNameById, onUseDraft }: Props) {
  const { t } = useTranslation();
  const suggestReply = useSuggestReply();
  const summarize = useSummarizeTicket();
  const { data: cannedResponses = [] } = useCannedResponses();
  const [draft, setDraft] = useState('');

  if (!isAiEnabled || messages.length === 0) return null;

  const thread: ThreadMessageInput[] = messages.map((message) => ({
    author: authorNameById.get(message.authorId ?? '') ?? undefined,
    type: message.type,
    body: message.body,
  }));

  const draftReply = () => {
    suggestReply.mutate(
      {
        subject,
        messages: thread,
        cannedResponses: cannedResponses.map((response) => response.body),
      },
      {
        onSuccess: (result) => setDraft(result.draft),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const runSummarize = () => {
    summarize.mutate(
      { subject, messages: thread },
      { onError: (error) => toast.error(error.message) }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={draftReply}
          disabled={suggestReply.isPending}
        >
          <Sparkles className="mr-1 size-4" />
          {suggestReply.isPending ? t('Ai.Thinking') : t('Ai.DraftReply')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={runSummarize}
          disabled={summarize.isPending}
        >
          <FileText className="mr-1 size-4" />
          {summarize.isPending ? t('Ai.Thinking') : t('Ai.Summarize')}
        </Button>
      </div>

      {summarize.data && <p className="text-muted-foreground text-sm">{summarize.data.summary}</p>}

      {draft && (
        <div className="space-y-2">
          <Separator />
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            aria-label={t('Ai.DraftReply')}
          />
          <Button type="button" size="sm" className="h-7" onClick={() => onUseDraft(draft)}>
            {t('Ai.InsertDraft')}
          </Button>
        </div>
      )}
    </div>
  );
}
