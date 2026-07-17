import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, User } from 'lucide-react';

import { useAuthStore } from '~/stores/auth';
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

  return (
    <header className="bg-background flex h-16 items-center justify-end gap-3 border-b px-4">
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
    </header>
  );
});
