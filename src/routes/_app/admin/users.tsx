import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { userQueries } from '~/features/admin/users/api/user-queries';
import {
  USER_SEARCH_DEFAULTS,
  toUserListParams,
  userSearchSchema,
} from '~/features/admin/users/schemas/user-search-schema';
import Users from '~/features/admin/users/pages/users';

/**
 * `/admin/users` — the server-side paginated user list, its state living entirely in
 * the URL. Mirrors `/tickets`; the RBAC guard runs once on the parent `/admin` layout,
 * not here.
 */
export const Route = createFileRoute('/_app/admin/users')({
  validateSearch: userSearchSchema,
  search: { middlewares: [stripSearchParams(USER_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(userQueries.list(toUserListParams(deps))),
  component: Users,
});
