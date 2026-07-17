import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Inbox, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';

import { cn } from '~/utils/cn';
import { Logo } from '~/components/ui/logo';

type NavPath = '/' | '/tickets' | '/admin/permissions' | '/admin/roles' | '/admin/users';

type NavItem = { to: NavPath; icon?: LucideIcon; label: string };

function NavLink({ to, icon: Icon, label, active }: NavItem & { active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span>{label}</span>
    </Link>
  );
}

export const Sidebar = memo(function Sidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const primary: NavItem[] = [
    { to: '/', icon: Home, label: t('Sidebar.Home') },
    { to: '/tickets', icon: Inbox, label: t('Fields.Tickets') },
  ];

  const admin: NavItem[] = [
    { to: '/admin/permissions', label: t('Fields.Permissions') },
    { to: '/admin/roles', label: t('Fields.Roles') },
    { to: '/admin/users', label: t('Fields.Users') },
  ];

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-64 flex-col border-r">
      {/* The logo is the only content of this link, so its label is what a screen reader
          announces for "go home" — it must name the app. Inline SVG (not <img>) so the
          wordmark's `currentColor` text follows the sidebar colour and stays legible in
          dark mode. */}
      <Link to="/" className="flex h-16 items-center justify-center border-b">
        <Logo label={t('App.Name')} className="h-11 w-auto" />
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {primary.map((item) => (
          <NavLink key={item.to} {...item} active={pathname === item.to} />
        ))}

        <div className="text-sidebar-foreground/60 flex items-center gap-2 px-3 pt-4 pb-1 text-xs font-medium tracking-wide uppercase">
          <ShieldCheck className="size-3.5" />
          {t('Sidebar.Admin')}
        </div>
        {admin.map((item) => (
          <NavLink key={item.to} {...item} active={pathname === item.to} />
        ))}
      </nav>
    </aside>
  );
});
