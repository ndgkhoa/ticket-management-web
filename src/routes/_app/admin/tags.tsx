import { createFileRoute } from '@tanstack/react-router';

import { tagListQuery } from '~/features/admin/tags/api/tag-queries';
import Tags from '~/features/admin/tags/pages/tags';

export const Route = createFileRoute('/_app/admin/tags')({
  loader: ({ context }) => context.queryClient.ensureQueryData(tagListQuery()),
  component: Tags,
});
