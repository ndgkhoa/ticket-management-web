import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Badge, Button } from '~/components/ui';
import { isAiEnabled } from '~/features/tickets/api/ai-client';
import { useTriageTicket } from '~/features/tickets/api/triage-ticket';
import type { TicketPriority } from '~/features/tickets/schemas/ticket-enums';

type Category = { id: string; name: string };

type Props = {
  subject: string;
  description: string;
  categories: Category[];
  onApply: (suggestion: { priority: TicketPriority; categoryId: string | null }) => void;
};

/**
 * AI triage hint on the create form: a button that asks the model for a priority (and
 * category) from what's typed so far, then lets the user apply it. Rendered only when AI
 * is enabled; on any error it toasts and stays out of the way — the form works without it.
 */
export function AiTriageHint({ subject, description, categories, onApply }: Props) {
  const { t } = useTranslation();
  const triage = useTriageTicket();

  if (!isAiEnabled) return null;

  const suggest = () => {
    triage.mutate(
      { subject, description, categories: categories.map((category) => category.name) },
      { onError: (error) => toast.error(error.message) }
    );
  };

  const result = triage.data;
  // Map the model's category label back to an id (case-insensitive); null if it picked none.
  const matchedCategory = result?.category
    ? categories.find((category) => category.name.toLowerCase() === result.category?.toLowerCase())
    : undefined;

  return (
    <div className="rounded-md border border-dashed p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Sparkles className="size-4" />
          {t('Ai.TriageTitle')}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={suggest}
          disabled={!subject.trim() || triage.isPending}
        >
          {triage.isPending ? t('Ai.Thinking') : t('Ai.Suggest')}
        </Button>
      </div>

      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">
              {t('Fields.Priority')}: {result.priority}
            </Badge>
            {matchedCategory && (
              <Badge variant="secondary">
                {t('Fields.Category')}: {matchedCategory.name}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{result.reason}</p>
          <Button
            type="button"
            size="sm"
            className="h-7"
            onClick={() =>
              onApply({
                priority: result.priority,
                categoryId: matchedCategory?.id ?? null,
              })
            }
          >
            {t('Ai.Apply')}
          </Button>
        </div>
      )}
    </div>
  );
}
