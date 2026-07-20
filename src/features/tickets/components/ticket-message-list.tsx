import { Lock, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback, AvatarImage, Badge } from '~/components/ui';
import { RichTextView } from '~/components/rich-text-view';
import { cn } from '~/utils/cn';
import type { TicketMessage } from '~/features/tickets/schemas/ticket-message-schema';
import type { Assignee } from '~/features/tickets/schemas/assignee-schema';

type Props = {
  messages: TicketMessage[];
  authors: Map<string, Assignee>;
};

export function TicketMessageList({ messages, authors }: Props) {
  const { t } = useTranslation();

  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">{t('Tickets.NoMessages')}</p>
    );
  }

  return (
    <ul className="space-y-4">
      {messages.map((message) => {
        const author = message.authorId ? authors.get(message.authorId) : undefined;
        const isNote = message.type === 'internal_note';
        return (
          <li
            key={message.id}
            className={cn(
              'rounded-md border p-3',
              isNote && 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Avatar className="size-7">
                <AvatarImage src={author?.avatarUrl ?? undefined} alt={author?.fullName ?? ''} />
                <AvatarFallback>
                  <UserIcon className="size-4" />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{author?.fullName ?? '—'}</span>
              {isNote && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="size-3" />
                  {t('Tickets.InternalNote')}
                </Badge>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                {new Date(message.createdAt).toLocaleString()}
              </span>
            </div>
            <RichTextView html={message.body} />
          </li>
        );
      })}
    </ul>
  );
}
