import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** e.g. a "Create your first ticket" CTA, or a "Clear filters" button. */
  action?: ReactNode;
};

/**
 * The presentational shell for a table's empty and no-results states. The two are
 * distinct messages by design — "nothing exists yet, here's how to start" versus
 * "your filters matched nothing, here's how to clear them" — so each screen passes
 * its own copy and action rather than sharing one generic "No data".
 */
export function DataTableEmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      {Icon && <Icon className="text-muted-foreground size-8" />}
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
