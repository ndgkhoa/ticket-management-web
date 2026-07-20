import { useTranslation } from 'react-i18next';

import { Skeleton } from '~/components/ui';

type Props = {
  label: string;
  value: string;
  hint?: string;
  isLoading?: boolean;
  isError?: boolean;
};

export function KpiCard({ label, value, hint, isLoading, isError }: Props) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : isError ? (
        <p className="text-destructive mt-2 text-sm">{t('Dashboard.LoadError')}</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
      {hint && !isLoading && !isError && (
        <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
      )}
    </div>
  );
}
