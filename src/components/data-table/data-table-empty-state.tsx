import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

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
