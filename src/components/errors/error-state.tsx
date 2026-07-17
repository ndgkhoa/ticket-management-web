import type { ReactNode } from 'react';

type Props = {
  /** Large status code shown above the title, e.g. "404" or "500". */
  code?: string;
  title: string;
  description?: string;
  /** Recovery action — a back/retry button. */
  action?: ReactNode;
};

/**
 * The shared presentational shell for full-page error screens (route errors, the
 * render-error boundary, not-found). One layout so 404/500 read identically; each
 * caller supplies its own copy and recovery action.
 */
export function ErrorState({ code, title, description, action }: Props) {
  return (
    <div className="grid h-full min-h-[60vh] w-full place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {code && <p className="text-muted-foreground text-6xl font-bold">{code}</p>}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-muted-foreground max-w-md">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
