import { Fragment } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from '@tanstack/react-router';

// The derived path is cast to a router path since every navigable value here is a real,
// currently-navigable route.
type RoutePath = '/';

// Path segments that are group prefixes without a page of their own — rendered as plain
// text, never a link (`/admin` only redirects to its first child).
const NON_NAVIGABLE_SEGMENTS = new Set(['admin']);

// Path segment → i18n key, so a crumb reads in the active language. A segment with no
// entry (a future id, say) falls back to its capitalised raw value — never a raw key.
type LabelKey =
  | 'Sidebar.Admin'
  | 'Fields.Tickets'
  | 'Fields.Users'
  | 'Fields.Roles'
  | 'Fields.Permissions'
  | 'Fields.Teams'
  | 'Fields.Categories'
  | 'Fields.Tags'
  | 'Fields.SlaPolicies';

const SEGMENT_LABELS: Record<string, LabelKey> = {
  admin: 'Sidebar.Admin',
  tickets: 'Fields.Tickets',
  users: 'Fields.Users',
  roles: 'Fields.Roles',
  permissions: 'Fields.Permissions',
  teams: 'Fields.Teams',
  categories: 'Fields.Categories',
  tags: 'Fields.Tags',
  'sla-policies': 'Fields.SlaPolicies',
};

export function Breadcrumb() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const items = segments.map((value, index) => {
    const isLast = index === segments.length - 1;
    const labelKey = SEGMENT_LABELS[value];

    return {
      key: `${value}-${index}`,
      isLast,
      navigable: !isLast && !NON_NAVIGABLE_SEGMENTS.has(value),
      to: `/${segments.slice(0, index + 1).join('/')}`,
      label: labelKey ? t(labelKey) : value,
      // Only the raw-value fallback needs title-casing; translated labels are already cased.
      isFallback: labelKey === undefined,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="my-4">
      <ol className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <li>
          <Link to="/" className="hover:text-foreground flex items-center transition-colors">
            <Home className="size-4" />
          </Link>
        </li>
        {items.map((item) => (
          <Fragment key={item.key}>
            <ChevronRight className="size-3.5" />
            <li>
              {item.navigable ? (
                <Link
                  to={item.to as RoutePath}
                  className={`hover:text-foreground flex items-center transition-colors ${item.isFallback ? 'capitalize' : ''}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={item.isLast ? 'page' : undefined}
                  className={`text-foreground flex items-center font-medium ${item.isFallback ? 'capitalize' : ''}`}
                >
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
