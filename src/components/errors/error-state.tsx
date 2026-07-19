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
    // Center in the viewport. `min-h` (not `h-full`) so it fills even when the parent has
    // no definite height (the root not-found renders outside the app layout); minus the
    // 4rem navbar so the in-app variant fills its content area without a scrollbar.
    <div className="grid min-h-[calc(100svh-4rem)] w-full place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {code && <p className="text-muted-foreground text-6xl font-bold">{code}</p>}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-muted-foreground max-w-md">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
