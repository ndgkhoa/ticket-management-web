import { Badge } from '~/components/ui';
import type { TicketPriority } from '~/features/tickets/schemas/ticket-enums';

// Colour per priority, typed by the enum so a new priority is a compile error until styled.
// Escalating tint (teal → blue → orange → red) reads severity at a glance in both themes.
// These four hues are disjoint from the five status hues (ticket-status-badge): together
// they form one 9-colour set so status and priority badges never share a colour.
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{priority}</Badge>;
}
