import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FullPageFallback() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground grid h-full w-full place-items-center gap-3"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-primary size-8 animate-spin" />
        <span className="text-sm">{t('Common.Loading')}</span>
      </div>
    </div>
  );
}
