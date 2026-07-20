import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui/button';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage === 'vi' ? 'vi' : 'en';
  const next = current === 'vi' ? 'en' : 'vi';

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t('Common.Language')}
      onClick={() => void i18n.changeLanguage(next)}
    >
      {}
      <span className="text-sm font-normal">{current.toUpperCase()}</span>
    </Button>
  );
}
