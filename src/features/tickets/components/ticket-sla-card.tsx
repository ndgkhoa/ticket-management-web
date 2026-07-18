import { useTranslation } from 'react-i18next';

import { Badge } from '~/components/ui';
import { cn } from '~/utils/cn';
import { useSlaPolicyList } from '~/features/admin/sla-policies/api/sla-policy-queries';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

type Props = { ticket: Ticket };

type SlaVariant = 'met' | 'met_late' | 'breached' | 'pending' | 'pending_soon';
type SlaState = { label: string; variant: SlaVariant; due: number };

const AMBER = 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400';

// Badge look per SLA state: green = met on time, amber = late or nearly-due, red = breached,
// neutral = comfortably counting down.
const SLA_BADGE: Record<SlaVariant, { variant: 'outline' | 'destructive'; className?: string }> = {
  met: {
    variant: 'outline',
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  met_late: { variant: 'outline', className: AMBER },
  pending_soon: { variant: 'outline', className: AMBER },
  breached: { variant: 'destructive' },
  pending: { variant: 'outline' },
};

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
      const onTime = new Date(doneAt).getTime() <= due;
      return {
        label: onTime ? t('Tickets.Met') : t('Tickets.MetLate'),
        variant: onTime ? 'met' : 'met_late',
        due,
      };
    }
    if (now > due) return { label: t('Tickets.Breached'), variant: 'breached', due };
    // Within the last quarter of the window → amber "due soon"; otherwise a calm countdown.
    const remaining = due - now;
    const soon = remaining < dueMinutes * 60_000 * 0.25;
    return {
      label: formatDelta(Math.round(remaining / 60_000), t),
      variant: soon ? 'pending_soon' : 'pending',
      due,
    };
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
  const style = SLA_BADGE[state.variant];
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge
        variant={style.variant}
        className={cn(style.className)}
        title={new Date(state.due).toLocaleString()}
      >
        {state.label}
      </Badge>
    </div>
  );
}
