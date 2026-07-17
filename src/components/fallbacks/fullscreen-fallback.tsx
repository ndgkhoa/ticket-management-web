import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FullscreenFallback() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background/80 fixed inset-0 z-50 grid place-items-center backdrop-blur-sm"
    >
      <Loader2 className="text-primary size-12 animate-spin" />
      <span className="sr-only">{t('Common.Loading')}</span>
    </div>
  );
}
