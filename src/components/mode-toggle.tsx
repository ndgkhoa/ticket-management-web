import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui/button';
import { useTheme } from '~/components/theme-provider';

/**
 * Light/dark toggle as a single icon button (no dropdown): a click just flips between the
 * two. The provider still defaults to `system` on a fresh visit (follows the OS), but the
 * first click resolves the effective theme and pins the opposite explicitly.
 */
export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t('Common.Theme')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {/* Sun in light, Moon in dark — swapped by the `.dark` class on <html>. */}
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
