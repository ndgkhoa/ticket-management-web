import { Badge } from '~/components/ui';
import type { TicketStatus } from '~/features/tickets/schemas/ticket-enums';

// Colour per status, typed by the enum so a new status is a compile error until styled.
// Light + dark variants; the tint/muted-text pairing keeps AA contrast in both themes.
const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  on_hold: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  solved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  closed: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}
