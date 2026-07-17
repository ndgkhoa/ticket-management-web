import { createFileRoute } from '@tanstack/react-router';

import { tagListQuery } from '~/features/admin/tags/api/tag-queries';
import Tags from '~/features/admin/tags/pages/tags';

/** `/admin/tags` — CRUD for ticket tags (guarded by the admin layout). The loader warms
 *  the list so the table renders with data, not a loading skeleton. */
export const Route = createFileRoute('/_app/admin/tags')({
  loader: ({ context }) => context.queryClient.ensureQueryData(tagListQuery()),
  component: Tags,
});
