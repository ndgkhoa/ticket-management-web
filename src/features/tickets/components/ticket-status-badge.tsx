import { Badge } from '~/components/ui';
import type { TicketStatus } from '~/features/tickets/schemas/ticket-enums';

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  on_hold: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  solved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  closed: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}
