import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '~/lib/route-guards';

/**
 * Layout for the admin area. The guard runs once here for every admin screen: a user
 * without `user.manage` (agents and customers) is redirected home before any admin
 * route renders. No component — the route renders its children through the default
 * outlet.
 */
export const Route = createFileRoute('/_app/admin')({
  beforeLoad: () => requirePermission('user.manage'),
});
