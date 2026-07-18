import { useTranslation } from 'react-i18next';

import type { TicketEvent } from '~/features/tickets/schemas/ticket-event-schema';
import type { Assignee } from '~/features/tickets/schemas/assignee-schema';

type Props = {
  events: TicketEvent[];
  /** id → profile, for the actor name. */
  actors: Map<string, Assignee>;
};

/**
 * The activity feed — the ticket's `ticket_events`, newest first. Each event renders a short
 * actor + action line; the action text is keyed by `event_type` with a couple of `meta`
 * values (the new status/priority) woven in where the type carries them.
 */
export function TicketActivity({ events, actors }: Props) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('Tickets.NoActivity')}</p>;
  }

  const describe = (event: TicketEvent): string => {
    const to = typeof event.meta.to === 'string' ? event.meta.to : '';
    switch (event.eventType) {
      case 'status_changed':
        return t('Tickets.Event.status_changed', { to });
      case 'priority_changed':
        return t('Tickets.Event.priority_changed', { to });
      case 'commented':
        return event.meta.type === 'internal_note'
          ? t('Tickets.Event.noted')
          : t('Tickets.Event.commented');
      default:
        return t(`Tickets.Event.${event.eventType}`);
    }
  };

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const actor = event.actorId ? actors.get(event.actorId) : undefined;
        return (
          <li key={event.id} className="text-sm">
            <span className="font-medium">{actor?.fullName ?? '—'}</span>{' '}
            <span className="text-muted-foreground">{describe(event)}</span>
            <div className="text-muted-foreground text-xs">
              {new Date(event.createdAt).toLocaleString()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
