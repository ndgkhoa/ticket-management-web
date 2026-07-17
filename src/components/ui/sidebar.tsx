import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderTree,
  Home,
  Inbox,
  KeyRound,
  ShieldCheck,
  Tags,
  Timer,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';

import logoMark from '/images/logo-mark.svg';
import { cn } from '~/utils/cn';
import { Logo } from '~/components/ui/logo';
import { useAuthStore } from '~/stores/auth';
import { usePreferencesStore } from '~/stores/preferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

type NavPath =
  | '/'
  | '/tickets'
  | '/admin/permissions'
  | '/admin/roles'
  | '/admin/users'
  | '/admin/teams'
  | '/admin/categories'
  | '/admin/tags'
  | '/admin/sla-policies';

type NavItem = { to: NavPath; icon: LucideIcon; label: string };

function NavLink({
  to,
  icon: Icon,
  label,
  active,
  collapsed,
}: NavItem & { active: boolean; collapsed: boolean }) {
  const link = (
    <Link
      to={to}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
        collapsed ? 'justify-center px-0' : 'px-3',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  // Collapsed: the label lives in a tooltip since it's hidden from the rail.
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export const Sidebar = memo(function Sidebar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  // Role-aware nav: hide the admin group unless the user can manage it. This mirrors
  // the `/admin` route guard (`user.manage`) — RLS is the real enforcement.
  const canManageAdmin = useAuthStore((state) => state.hasPermission('user.manage'));
  const collapsed = usePreferencesStore((state) => state.sidebarCollapsed);

  const primary: NavItem[] = [
    { to: '/', icon: Home, label: t('Sidebar.Home') },
    { to: '/tickets', icon: Inbox, label: t('Fields.Tickets') },
  ];

  const admin: NavItem[] = [
    { to: '/admin/permissions', icon: KeyRound, label: t('Fields.Permissions') },
    { to: '/admin/roles', icon: UserCog, label: t('Fields.Roles') },
    { to: '/admin/users', icon: Users, label: t('Fields.Users') },
    { to: '/admin/teams', icon: UsersRound, label: t('Fields.Teams') },
    { to: '/admin/categories', icon: FolderTree, label: t('Fields.Categories') },
    { to: '/admin/tags', icon: Tags, label: t('Fields.Tags') },
    { to: '/admin/sla-policies', icon: Timer, label: t('Fields.SlaPolicies') },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground flex h-full flex-col border-r transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo is the link's only content, so its label is the "go home" name. Inline
            SVG wordmark expanded; just the mark when collapsed to fit the rail. */}
        <Link to="/" className="flex h-16 items-center justify-center border-b">
          {collapsed ? (
            <img src={logoMark} alt={t('App.Name')} className="h-8" />
          ) : (
            <Logo label={t('App.Name')} className="h-11 w-auto" />
          )}
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {primary.map((item) => (
            <NavLink key={item.to} {...item} active={pathname === item.to} collapsed={collapsed} />
          ))}

          {canManageAdmin && (
            <>
              {collapsed ? (
                <div className="border-sidebar-border/50 my-2 border-t" />
              ) : (
                <div className="text-sidebar-foreground/60 flex items-center gap-2 px-3 pt-4 pb-1 text-xs font-medium tracking-wide uppercase">
                  <ShieldCheck className="size-3.5" />
                  {t('Sidebar.Admin')}
                </div>
              )}
              {admin.map((item) => (
                <NavLink
                  key={item.to}
                  {...item}
                  active={pathname === item.to}
                  collapsed={collapsed}
                />
              ))}
            </>
          )}
        </nav>
      </aside>
    </TooltipProvider>
  );
});
