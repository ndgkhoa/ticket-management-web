import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRouteApi } from '@tanstack/react-router';

import { Avatar, AvatarFallback, AvatarImage, Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { TicketStatusBadge } from '~/features/tickets/components/ticket-status-badge';
import { TicketPriorityBadge } from '~/features/tickets/components/ticket-priority-badge';
import { TicketComposer } from '~/features/tickets/components/ticket-composer';
import { TicketMessageList } from '~/features/tickets/components/ticket-message-list';
import { TicketProperties } from '~/features/tickets/components/ticket-properties';
import { TicketSlaCard } from '~/features/tickets/components/ticket-sla-card';
import { TicketAttachments } from '~/features/tickets/components/ticket-attachments';
import { TicketActivity } from '~/features/tickets/components/ticket-activity';
import { AiSuggestionPanel } from '~/features/tickets/components/ai-suggestion-panel';
import { SimilarTicketsPanel } from '~/features/tickets/components/similar-tickets-panel';
import { useTicketDetail } from '~/features/tickets/api/ticket-queries';
import { useTicketMessages } from '~/features/tickets/api/ticket-message-queries';
import { useTicketEvents } from '~/features/tickets/api/ticket-event-queries';
import { useTicketTags } from '~/features/tickets/api/ticket-tag-queries';
import { useProfileLookup } from '~/features/tickets/api/profile-lookup-queries';
import { useTicketFilterOptions } from '~/features/tickets/hooks/use-ticket-filter-options';
import { useTicketDetailRealtime } from '~/features/tickets/hooks/use-ticket-detail-realtime';

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

  // A draft accepted from the AI panel, handed to the composer to load then cleared.
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  // Every profile the page names — requester, assignee, message authors, event actors.
  const profileIds = useMemo(() => {
    const ids = new Set<string>([ticket.requesterId]);
    if (ticket.assigneeId) ids.add(ticket.assigneeId);
    for (const message of messages) if (message.authorId) ids.add(message.authorId);
    for (const event of events) if (event.actorId) ids.add(event.actorId);
    return [...ids];
  }, [ticket.requesterId, ticket.assigneeId, messages, events]);
  const profiles = useProfileLookup(profileIds);
  const viewers = useTicketDetailRealtime(ticketId);
  const authorNameById = useMemo(
    () => new Map([...profiles].map(([id, profile]) => [id, profile.fullName])),
    [profiles]
  );

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
        {viewers.length > 0 && (
          <span className="ml-auto flex items-center gap-1" title={t('Tickets.Viewing')}>
            <span className="flex -space-x-2">
              {viewers.slice(0, 5).map((viewer) => (
                <Avatar key={viewer.id} className="border-background size-6 border-2">
                  <AvatarImage src={viewer.avatarUrl ?? undefined} alt={viewer.name} />
                  <AvatarFallback className="text-[10px]">
                    {viewer.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </span>
            <span className="text-muted-foreground text-xs">{t('Tickets.Viewing')}</span>
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <TicketMessageList messages={messages} authors={profiles} />
          {/* The whole page is keyed by ticketId at the route (see $ticketId.tsx), so these
              reset per ticket without needing their own keys. */}
          <AiSuggestionPanel
            subject={ticket.subject}
            messages={messages}
            authorNameById={authorNameById}
            onUseDraft={setAiDraft}
          />
          <TicketComposer
            ticketId={ticketId}
            insertDraft={aiDraft}
            onDraftConsumed={() => setAiDraft(null)}
          />
        </div>

        <div className="space-y-4">
          <Card title={t('Tickets.Sla')}>
            <TicketSlaCard ticket={ticket} />
          </Card>
          <Card title={t('Ai.SimilarTickets')}>
            <SimilarTicketsPanel ticketId={ticketId} />
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
          <Card title={t('Tickets.Attachments')}>
            <TicketAttachments ticketId={ticketId} />
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
