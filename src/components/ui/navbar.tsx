import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, PanelLeft, User } from 'lucide-react';

import { useAuthStore } from '~/stores/auth';
import { usePreferencesStore } from '~/stores/preferences';
import { Button } from '~/components/ui/button';
import { ModeToggle } from '~/components/mode-toggle';
import { LanguageToggle } from '~/components/language-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

export const Navbar = memo(function Navbar() {
  const { t } = useTranslation();
  const signOut = useAuthStore((state) => state.signOut);
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar);

  return (
    <header className="bg-background flex h-16 items-center justify-between gap-3 border-b px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label={t('Sidebar.Toggle')}>
        <PanelLeft />
      </Button>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t('Common.Logout')}>
              <User />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut />
              {t('Common.Logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});
