import { useTranslation } from 'react-i18next';

import { Badge } from '~/components/ui';
import { cn } from '~/utils/cn';
import { useSlaPolicyList } from '~/features/admin/sla-policies/api/sla-policy-queries';
import { slaVariant, type SlaVariant } from '~/features/tickets/components/sla-state';
import { effectiveNow } from '~/features/tickets/components/sla-pause';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

type Props = { ticket: Ticket };

type SlaState = { label: string; variant: SlaVariant; due: number };

const AMBER = 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400';

// The done/breached states have a fixed i18n label; the two pending states instead show the
// live countdown, so they're absent here and fall through to `formatDelta`.
const SLA_LABEL_KEY: Partial<
  Record<SlaVariant, 'Tickets.Met' | 'Tickets.MetLate' | 'Tickets.Breached'>
> = {
  met: 'Tickets.Met',
  met_late: 'Tickets.MetLate',
  breached: 'Tickets.Breached',
};

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
  // Effective now freezes the clock while the ticket is paused (pending/on_hold).
  const now = effectiveNow({
    now: Date.now(),
    pausedMs: ticket.slaPausedMs,
    pausedAt: ticket.slaPausedAt ? new Date(ticket.slaPausedAt).getTime() : null,
  });

  const stateFor = (due: number, windowMs: number, doneAt: string | null): SlaState => {
    const { variant } = slaVariant({
      due,
      windowMs,
      // Credit paused time to the met/late judgment too, same frame as `now`: a target hit
      // within the deadline after excluding parked time reads as met, not met-late.
      doneAt: doneAt ? new Date(doneAt).getTime() - ticket.slaPausedMs : null,
      now,
    });
    const labelKey = SLA_LABEL_KEY[variant];
    const label = labelKey ? t(labelKey) : formatDelta(Math.round((due - now) / 60_000), t);
    return { label, variant, due };
  };

  const firstResponseMs = policy.first_response_mins * 60_000;
  const resolutionMs = policy.resolution_mins * 60_000;
  // First response has no stored deadline — compute it. Resolution uses the DB-maintained
  // due_at so a reopened ticket's restarted deadline shows correctly (falls back for old rows).
  const resolutionDue = ticket.dueAt ? new Date(ticket.dueAt).getTime() : created + resolutionMs;
  const firstResponse = stateFor(
    created + firstResponseMs,
    firstResponseMs,
    ticket.firstResponseAt
  );
  const resolution = stateFor(resolutionDue, resolutionMs, ticket.resolvedAt);

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
