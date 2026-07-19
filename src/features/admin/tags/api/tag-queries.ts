import { createCrudQueries } from '~/features/admin/shared/use-crud-queries';
import { tagApi, type TagInput } from '~/features/admin/tags/api/tag-api';
import { tagKeys } from '~/features/admin/tags/constants/tag-keys';
import type { Tag } from '~/features/admin/tags/schemas/tag-schema';

export const {
  listQuery: tagListQuery,
  useList: useTagList,
  useCreate: useTagCreate,
  useUpdate: useTagUpdate,
  useRemove: useTagRemove,
} = createCrudQueries<Tag, TagInput>({ keys: tagKeys, api: tagApi });
