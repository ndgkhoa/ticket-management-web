import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui';
import { useCannedResponses } from '~/features/tickets/api/canned-response-queries';

type Props = {
  /** Insert the chosen response's body into the composer editor. */
  onInsert: (body: string) => void;
};

/**
 * Composer control: pick a saved canned response by title and drop its body into the reply
 * editor. Renders nothing until the library has entries (empty for anyone without `canned.read`,
 * whose fetch is disabled), so it never shows as a dead control.
 */
export function CannedResponsePicker({ onInsert }: Props) {
  const { t } = useTranslation();
  const { data: responses = [] } = useCannedResponses();

  if (responses.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1"
          aria-label={t('Tickets.CannedResponses')}
        >
          <MessageSquareText className="size-4" />
          <span className="hidden sm:inline">{t('Tickets.CannedResponses')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-xs">
        {responses.map((response) => (
          <DropdownMenuItem
            key={response.id}
            className="flex-col items-start gap-0.5"
            onSelect={() => onInsert(response.body)}
          >
            <span className="font-medium">{response.title}</span>
            <span className="text-muted-foreground line-clamp-1 text-xs">{response.body}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
