import { Badge } from '~/components/ui';
import type { TicketPriority } from '~/features/tickets/schemas/ticket-enums';

// Colour per priority, typed by the enum so a new priority is a compile error until styled.
// Escalating tint (slate → blue → orange → red) reads severity at a glance in both themes.
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{priority}</Badge>;
}
