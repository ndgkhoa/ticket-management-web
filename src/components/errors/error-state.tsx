import type { ReactNode } from 'react';

type Props = {
  code?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function ErrorState({ code, title, description, action }: Props) {
  return (
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
