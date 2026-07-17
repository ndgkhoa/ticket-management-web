import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * `/admin` has no page of its own — send it to the first admin screen so the URL and the
 * sidebar's admin group have a landing target. Users is the default (the most-used one).
 */
export const Route = createFileRoute('/_app/admin/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/users' });
  },
});
