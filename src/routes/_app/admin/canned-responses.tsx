import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { cannedResponseListQuery } from '~/features/admin/canned-responses/api/canned-response-queries';
import {
  CANNED_RESPONSE_SEARCH_DEFAULTS,
  cannedResponseSearchSchema,
  toCannedResponseListParams,
} from '~/features/admin/canned-responses/schemas/canned-response-search-schema';
import CannedResponses from '~/features/admin/canned-responses/pages/canned-responses';

/**
 * `/admin/canned-responses` — the server-side paginated canned-response list with
 * full CRUD, its list state living entirely in the URL. Mirrors `/admin/users`; the
 * RBAC guard runs once on the parent `/admin` layout, not here.
 */
export const Route = createFileRoute('/_app/admin/canned-responses')({
  validateSearch: cannedResponseSearchSchema,
  search: { middlewares: [stripSearchParams(CANNED_RESPONSE_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(cannedResponseListQuery(toCannedResponseListParams(deps))),
  component: CannedResponses,
});
