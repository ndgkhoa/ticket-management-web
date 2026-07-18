import { useTranslation } from 'react-i18next';

import { Badge } from '~/components/ui';
import { useSlaPolicyList } from '~/features/admin/sla-policies/api/sla-policy-queries';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

type Props = { ticket: Ticket };

type SlaState = { label: string; variant: 'met' | 'breached' | 'pending'; due: number };

/** Format a signed minute delta as a coarse "in 2h" / "3h overdue" string. */
function formatDelta(minutes: number, t: ReturnType<typeof useTranslation>['t']): string {
  const abs = Math.abs(minutes);
  const value = abs >= 60 ? `${Math.round(abs / 60)}h` : `${abs}m`;
  return minutes >= 0 ? t('Tickets.DueIn', { value }) : t('Tickets.Overdue', { value });
}

/**
 * SLA status for the ticket, derived from its priority's policy: first-response and
 * resolution each have a due time (created_at + the policy's minutes) and a state — met when
 * the stamp exists, breached when it's overdue and still unmet, otherwise a live countdown.
 * Reads the policy by priority rather than the ticket's `sla_policy_id`, so it works even
 * before a policy is pinned to the row.
 */
export function TicketSlaCard({ ticket }: Props) {
  const { t } = useTranslation();
  const { data: policies = [] } = useSlaPolicyList();
  const policy = policies.find((row) => row.priority === ticket.priority);

  if (!policy) return null;

  const created = new Date(ticket.createdAt).getTime();
  const now = Date.now();

  const stateFor = (dueMinutes: number, doneAt: string | null): SlaState => {
    const due = created + dueMinutes * 60_000;
    if (doneAt) {
      const met = new Date(doneAt).getTime() <= due;
      return { label: met ? t('Tickets.Met') : t('Tickets.MetLate'), variant: 'met', due };
    }
    if (now > due) return { label: t('Tickets.Breached'), variant: 'breached', due };
    return { label: formatDelta(Math.round((due - now) / 60_000), t), variant: 'pending', due };
  };

  const firstResponse = stateFor(policy.first_response_mins, ticket.firstResponseAt);
  const resolution = stateFor(policy.resolution_mins, ticket.resolvedAt);

  return (
    <div className="space-y-2">
      <SlaRow label={t('Tickets.FirstResponse')} state={firstResponse} />
      <SlaRow label={t('Tickets.Resolution')} state={resolution} />
    </div>
  );
}

function SlaRow({ label, state }: { label: string; state: SlaState }) {
  const variant =
    state.variant === 'breached'
      ? 'destructive'
      : state.variant === 'met'
        ? 'secondary'
        : 'outline';
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={variant} title={new Date(state.due).toLocaleString()}>
        {state.label}
      </Badge>
    </div>
  );
}
