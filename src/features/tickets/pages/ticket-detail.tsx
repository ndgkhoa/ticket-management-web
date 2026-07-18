import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getRouteApi } from '@tanstack/react-router';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { TicketStatusBadge } from '~/features/tickets/components/ticket-status-badge';
import { TicketPriorityBadge } from '~/features/tickets/components/ticket-priority-badge';
import { TicketComposer } from '~/features/tickets/components/ticket-composer';
import { TicketMessageList } from '~/features/tickets/components/ticket-message-list';
import { TicketProperties } from '~/features/tickets/components/ticket-properties';
import { TicketSlaCard } from '~/features/tickets/components/ticket-sla-card';
import { TicketActivity } from '~/features/tickets/components/ticket-activity';
import { useTicketDetail } from '~/features/tickets/api/ticket-queries';
import { useTicketMessages } from '~/features/tickets/api/ticket-message-queries';
import { useTicketEvents } from '~/features/tickets/api/ticket-event-queries';
import { useTicketTags } from '~/features/tickets/api/ticket-tag-queries';
import { useProfileLookup } from '~/features/tickets/api/profile-lookup-queries';
import { useTicketFilterOptions } from '~/features/tickets/hooks/use-ticket-filter-options';

const route = getRouteApi('/_app/tickets/$ticketId');

/** A bordered sidebar section with a heading. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TicketDetail() {
  const { t } = useTranslation();
  const { ticketId } = route.useParams();

  const ticketQuery = useTicketDetail(ticketId);
  const messagesQuery = useTicketMessages(ticketId);
  const eventsQuery = useTicketEvents(ticketId);
  const tagsQuery = useTicketTags(ticketId);
  const options = useTicketFilterOptions();

  const ticket = ticketQuery.data;
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  // Every profile the page names — requester, assignee, message authors, event actors.
  const profileIds = useMemo(() => {
    const ids = new Set<string>([ticket.requesterId]);
    if (ticket.assigneeId) ids.add(ticket.assigneeId);
    for (const message of messages) if (message.authorId) ids.add(message.authorId);
    for (const event of events) if (event.actorId) ids.add(event.actorId);
    return [...ids];
  }, [ticket.requesterId, ticket.assigneeId, messages, events]);
  const profiles = useProfileLookup(profileIds);

  if (ticketQuery.isError) {
    return <ErrorPage subTitle={ticketQuery.error.message} />;
  }

  const requester = profiles.get(ticket.requesterId);

  return (
    <Container title={ticket.subject} showBack>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketPriorityBadge priority={ticket.priority} />
        <span className="text-muted-foreground text-sm">
          {t('Tickets.RequestedBy', { name: requester?.fullName ?? '—' })}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TicketMessageList messages={messages} authors={profiles} />
          <TicketComposer ticketId={ticketId} />
        </div>

        <div className="space-y-4">
          <Card title={t('Tickets.Sla')}>
            <TicketSlaCard ticket={ticket} />
          </Card>
          <Card title={t('Tickets.Properties')}>
            <TicketProperties
              ticket={ticket}
              assigneeOptions={options.assigneeOptions}
              teamOptions={options.teamOptions}
              categoryOptions={options.categoryOptions}
              tagOptions={options.tagOptions}
              ticketTagIds={tagsQuery.data ?? []}
            />
          </Card>
          <Card title={t('Tickets.Activity')}>
            <TicketActivity events={events} actors={profiles} />
          </Card>
        </div>
      </div>
    </Container>
  );
}

export default TicketDetail;
