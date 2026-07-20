import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, PanelLeft, User } from 'lucide-react';

import { useAuthStore } from '~/stores/auth';
import { usePreferencesStore } from '~/stores/preferences';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { ModeToggle } from '~/components/mode-toggle';
import { LanguageToggle } from '~/components/language-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

export const Navbar = memo(function Navbar() {
  const { t } = useTranslation();
  const signOut = useAuthStore((state) => state.signOut);
  const user = useAuthStore((state) => state.user);
  const toggleSidebar = usePreferencesStore((state) => state.toggleSidebar);

  const metadata = user?.user_metadata ?? {};
  const displayName = (metadata.full_name as string | undefined) ?? user?.email ?? '';
  const avatarUrl = metadata.avatar_url as string | undefined;

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
            <Button variant="outline" size="icon" aria-label={t('Common.Account')}>
              <User />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <Avatar size="sm">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>
                  <User className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                {metadata.full_name ? (
                  <span className="truncate text-sm font-medium">
                    {metadata.full_name as string}
                  </span>
                ) : null}
                <span className="text-muted-foreground truncate text-xs">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
