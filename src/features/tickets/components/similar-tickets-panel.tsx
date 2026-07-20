import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge, Skeleton } from '~/components/ui';
import { isAiEnabled } from '~/features/tickets/api/ai-client';
import { useSimilarTickets } from '~/features/tickets/api/semantic-search-queries';
import { TicketPriorityBadge } from '~/features/tickets/components/ticket-priority-badge';

type Props = { ticketId: string };

export function SimilarTicketsPanel({ ticketId }: Props) {
  const { t } = useTranslation();
  const query = useSimilarTickets(ticketId);

  if (!isAiEnabled) return null;

  if (query.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    );
  }

  const matches = query.data ?? [];
  if (matches.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('Ai.NoSimilar')}</p>;
  }

  return (
    <ul className="space-y-2">
      {matches.map((match) => (
        <li key={match.id} className="flex items-center justify-between gap-2">
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: match.id }}
            className="hover:text-primary truncate text-sm hover:underline"
            title={match.subject}
          >
            {match.subject}
          </Link>
          <span className="flex shrink-0 items-center gap-1.5">
            <TicketPriorityBadge priority={match.priority} />
            <Badge variant="outline">{Math.round(match.similarity * 100)}%</Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}
