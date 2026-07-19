import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, Container, Input, Skeleton } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { usePermissionList } from '~/features/admin/permissions/api/permission-queries';
import type { Permission } from '~/features/admin/permissions/schemas/permission-schema';

/**
 * The permission catalogue — read-only by design: codes are fixed by the RLS policies, so
 * editing them from the UI could only desync the two. Assigning permissions to roles is
 * the editable part and lives on the roles screen.
 *
 * Grouped by resource (the `resource` in each `resource.action` code) rather than shown as
 * one flat list: an admin configuring a role thinks "what can be done to tickets?", so the
 * catalogue is organised the same way. Every permission is system-defined, so there is no
 * "system" badge — it would sit on every row and mean nothing.
 */

// Display order of the resource groups; anything not listed falls to the end.
const RESOURCE_ORDER = [
  'ticket',
  'message',
  'user',
  'canned',
  'category',
  'tag',
  'team',
  'sla',
  'role',
  'permission',
] as const;

function resourceOf(code: string): string {
  return code.split('.')[0] || 'other';
}

function Permissions() {
  const { t } = useTranslation();
  const query = usePermissionList();
  const [search, setSearch] = useState('');

  // Localised resource headings. Literal keys keep `t()` type-checked; an unlisted
  // resource falls back to "other".
  const resourceLabels: Record<string, string> = {
    ticket: t('Permissions.Resources.ticket'),
    message: t('Permissions.Resources.message'),
    user: t('Permissions.Resources.user'),
    canned: t('Permissions.Resources.canned'),
    category: t('Permissions.Resources.category'),
    tag: t('Permissions.Resources.tag'),
    team: t('Permissions.Resources.team'),
    sla: t('Permissions.Resources.sla'),
    role: t('Permissions.Resources.role'),
    permission: t('Permissions.Resources.permission'),
  };
  const labelFor = (resource: string) =>
    resourceLabels[resource] ?? t('Permissions.Resources.other');

  const groups = useMemo(() => {
    const permissions = query.data ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? permissions.filter(
          (permission) =>
            permission.code.toLowerCase().includes(term) ||
            (permission.description ?? '').toLowerCase().includes(term)
        )
      : permissions;

    const byResource = new Map<string, Permission[]>();
    for (const permission of filtered) {
      const resource = resourceOf(permission.code);
      const list = byResource.get(resource) ?? [];
      list.push(permission);
      byResource.set(resource, list);
    }
    for (const list of byResource.values()) list.sort((a, b) => a.code.localeCompare(b.code));

    // Known resources first in the defined order, then any leftover alphabetically.
    const order = (resource: string) => {
      const index = RESOURCE_ORDER.indexOf(resource as (typeof RESOURCE_ORDER)[number]);
      return index === -1 ? RESOURCE_ORDER.length : index;
    };
    return [...byResource.entries()].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b));
  }, [query.data, search]);

  if (query.isError) return <ErrorPage subTitle={query.error.message} />;

  return (
    <Container title={t('Common.List', { name: t('Fields.Permission', { count: 2 }) })}>
      <div className="space-y-4">
        <div className="relative w-full md:max-w-[360px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Common.Search')}
            className="h-8 pl-8"
            aria-label={t('Common.Search')}
          />
        </div>

        {query.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('Common.NoResults')}</p>
        ) : (
          groups.map(([resource, permissions]) => (
            <section key={resource} className="overflow-hidden rounded-md border">
              <div className="bg-muted/40 flex items-center gap-2 border-b px-4 py-2.5">
                <h2 className="text-sm font-semibold">{labelFor(resource)}</h2>
                <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1">
                  {permissions.length}
                </Badge>
              </div>
              <ul className="divide-y">
                {permissions.map((permission) => (
                  <li
                    key={permission.id}
                    className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <code className="text-foreground w-full shrink-0 font-mono text-sm sm:w-64">
                      {permission.code}
                    </code>
                    <span className="text-muted-foreground text-sm">
                      {permission.description ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </Container>
  );
}

export default Permissions;
