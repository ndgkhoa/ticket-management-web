import { Fragment } from 'react';
import { ChevronRight, Home, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// Derived from the current path. The `admin` group has no page of its own, so it maps
// back to home; the derived string is cast to a router path since every value here is a
// real, currently-navigable route.
type RoutePath = '/';

const specialSegments: Record<string, ReactNode> = {
  admin: <ShieldCheck className="size-4" />,
};

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const items = segments.map((value, index) => {
    const isLast = index === segments.length - 1;
    const special = specialSegments[value];
    const to = special ? '/' : `/${segments.slice(0, index + 1).join('/')}`;
    const label = special ?? <span className="capitalize">{value}</span>;

    return { key: `${value}-${index}`, isLast, to, label };
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
              {item.isLast ? (
                <span aria-current="page" className="text-foreground flex items-center font-medium">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to as RoutePath}
                  className="hover:text-foreground flex items-center transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
