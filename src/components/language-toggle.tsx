import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui/button';

/**
 * Language switcher as a single icon-sized toggle (matching ModeToggle), not a dropdown:
 * with only two languages a click just flips between them. The button shows the active
 * language code so the current choice is visible at a glance.
 */
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
      {/* font-normal so solid glyphs sit close to the visual weight of the stroked
          lucide icons on the buttons beside it (bold text reads heavier than a 2px icon). */}
      <span className="text-sm font-normal">{current.toUpperCase()}</span>
    </Button>
  );
}
