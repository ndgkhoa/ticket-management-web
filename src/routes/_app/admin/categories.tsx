import { createFileRoute } from '@tanstack/react-router';

import { categoryListQuery } from '~/features/admin/categories/api/category-queries';
import Categories from '~/features/admin/categories/pages/categories';

export const Route = createFileRoute('/_app/admin/categories')({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoryListQuery()),
  component: Categories,
});
