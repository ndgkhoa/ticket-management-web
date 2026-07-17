import { createFileRoute } from '@tanstack/react-router';

import Categories from '~/features/admin/categories/pages/categories';

/** `/admin/categories` — CRUD for ticket categories (guarded by the admin layout). */
export const Route = createFileRoute('/_app/admin/categories')({
  component: Categories,
});
