import { createCrudQueries } from '~/features/admin/shared/use-crud-queries';
import { categoryApi, type CategoryInput } from '~/features/admin/categories/api/category-api';
import { categoryKeys } from '~/features/admin/categories/constants/category-keys';
import type { Category } from '~/features/admin/categories/schemas/category-schema';

export const {
  useList: useCategoryList,
  useCreate: useCategoryCreate,
  useUpdate: useCategoryUpdate,
  useRemove: useCategoryRemove,
} = createCrudQueries<Category, CategoryInput>({ keys: categoryKeys, api: categoryApi });
