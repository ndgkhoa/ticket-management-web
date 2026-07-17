import { createFileRoute } from '@tanstack/react-router';

import { categoryListQuery } from '~/features/admin/categories/api/category-queries';
import Categories from '~/features/admin/categories/pages/categories';

/** `/admin/categories` — CRUD for ticket categories (guarded by the admin layout). The
 *  loader warms the list so the table renders with data, not a loading skeleton. */
export const Route = createFileRoute('/_app/admin/categories')({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoryListQuery()),
  component: Categories,
});
