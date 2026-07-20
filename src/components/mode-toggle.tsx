import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui/button';
import { useTheme } from '~/components/theme-provider';

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
      {}
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
