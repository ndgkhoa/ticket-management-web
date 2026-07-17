import { createFileRoute } from '@tanstack/react-router';

import Tags from '~/features/admin/tags/pages/tags';

/** `/admin/tags` — CRUD for ticket tags (guarded by the admin layout). */
export const Route = createFileRoute('/_app/admin/tags')({
  component: Tags,
});
