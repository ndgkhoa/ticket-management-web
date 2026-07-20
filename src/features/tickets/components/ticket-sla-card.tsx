import { useTranslation } from 'react-i18next';

import { Badge } from '~/components/ui';
import { cn } from '~/utils/cn';
import { useSlaPolicyList } from '~/features/admin/sla-policies/api/sla-policy-queries';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

type Props = { ticket: Ticket };

type SlaVariant = 'met' | 'met_late' | 'breached' | 'pending' | 'pending_soon';

type SlaState = { label: string; variant: SlaVariant; due: number };

function effectiveNow(args: { now: number; pausedMs: number; pausedAt: number | null }): number {
  const { now, pausedMs, pausedAt } = args;
  const currentPause = pausedAt !== null ? Math.max(0, now - pausedAt) : 0;
  return now - pausedMs - currentPause;
}

function slaVariant(args: { due: number; windowMs: number; doneAt: number | null; now: number }): {
  variant: SlaVariant;
  due: number;
} {
  const { due, windowMs, doneAt, now } = args;

  if (doneAt !== null) {
    return { variant: doneAt <= due ? 'met' : 'met_late', due };
  }
  if (now > due) return { variant: 'breached', due };

  const soon = due - now < windowMs * 0.25;
  return { variant: soon ? 'pending_soon' : 'pending', due };
}

const AMBER = 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400';

const SLA_LABEL_KEY: Partial<
  Record<SlaVariant, 'Tickets.Met' | 'Tickets.MetLate' | 'Tickets.Breached'>
> = {
  met: 'Tickets.Met',
  met_late: 'Tickets.MetLate',
  breached: 'Tickets.Breached',
};

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

function formatDelta(minutes: number, t: ReturnType<typeof useTranslation>['t']): string {
  const abs = Math.abs(minutes);
  const value = abs >= 60 ? `${Math.round(abs / 60)}h` : `${abs}m`;
  return minutes >= 0 ? t('Tickets.DueIn', { value }) : t('Tickets.Overdue', { value });
}

export function TicketSlaCard({ ticket }: Props) {
  const { t } = useTranslation();
  const { data: policies = [] } = useSlaPolicyList();
  const policy = policies.find((row) => row.priority === ticket.priority);

  if (!policy) return null;

  const created = new Date(ticket.createdAt).getTime();
  const now = effectiveNow({
    now: Date.now(),
    pausedMs: ticket.slaPausedMs,
    pausedAt: ticket.slaPausedAt ? new Date(ticket.slaPausedAt).getTime() : null,
  });

  const stateFor = (due: number, windowMs: number, doneAt: string | null): SlaState => {
    const { variant } = slaVariant({
      due,
      windowMs,
      doneAt: doneAt ? new Date(doneAt).getTime() - ticket.slaPausedMs : null,
      now,
    });
    const labelKey = SLA_LABEL_KEY[variant];
    const label = labelKey ? t(labelKey) : formatDelta(Math.round((due - now) / 60_000), t);
    return { label, variant, due };
  };

  const firstResponseMs = policy.first_response_mins * 60_000;
  const resolutionMs = policy.resolution_mins * 60_000;
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
